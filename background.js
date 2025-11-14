// Store the ID of the tab we are recording
let recordingTabId = null;

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'start') {
    // 1. Clear any old steps from storage
    chrome.storage.local.set({ steps: [] });
    
    // 2. Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        console.error("No active tab found.");
        return;
      }
      // 3. Store its ID
      recordingTabId = tabs[0].id;
      console.log("Starting recording on tab:", recordingTabId);

      // 4. Inject the content script
      chrome.scripting.executeScript({
        target: { tabId: recordingTabId },
        files: ['content.js']
      });
    });
  } else if (request.action === 'stop') {
    console.log("Stopping recording.");
    // 1. Open the review.html page in a new tab
    chrome.tabs.create({ url: 'review.html' });
    // 2. Clear the recording tab ID so we stop re-injecting
    recordingTabId = null;
    
  } else if (request.action === 'captureStep') {
    // When content.js requests a capture...
    // 1. Take a screenshot of the visible tab
    chrome.tabs.captureVisibleTab(null, {}, (dataUrl) => {
      // 2. Get the current steps from storage
      chrome.storage.local.get('steps', ({ steps }) => {
        // 3. Add the new step (with screenshot data)
        const newStep = {
          title: request.title,
          screenshot: dataUrl,
          description: "" // Add the empty description
        };
        steps.push(newStep);
        
        // 4. Save the updated steps back to storage
        chrome.storage.local.set({ steps: steps });
        console.log("Step captured:", request.title);
      });
    });
  }
  // Keep the message channel open for async responses
  return true; 
});

// *** THIS IS THE NEW, CRITICAL PART ***
// Listen for tab updates (like page loads or URL changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check if...
  // 1. We are currently recording (recordingTabId is set)
  // 2. This is the tab we are recording
  // 3. The page has finished loading
  if (recordingTabId && tabId === recordingTabId && changeInfo.status === 'complete') {
    console.log("Page reloaded. Re-injecting content script.");
    // Re-inject the content script into the new page
    chrome.scripting.executeScript({
      target: { tabId: recordingTabId },
      files: ['content.js']
    });
  }
});

// Also stop recording if the tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === recordingTabId) {
    console.log("Recording tab closed. Stopping recording.");
    recordingTabId = null;
  }
});
