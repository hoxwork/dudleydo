// This file is injected ONLY after 'Start' is clicked.

// Function to check if an element is likely sensitive (password or CVV)
function isSensitive(target) {
  const type = target.type ? target.type.toLowerCase() : '';
  const name = target.name ? target.name.toLowerCase() : '';
  const id = target.id ? target.id.toLowerCase() : '';

  // Check input type
  if (type === 'password') return true;
  
  // Check common names/ids for sensitive fields (e.g., credit cards, security codes)
  if (name.includes('card') || name.includes('cvv') || name.includes('security') || name.includes('ssn')) return true;
  if (id.includes('card') || id.includes('cvv') || id.includes('security') || id.includes('ssn')) return true;

  return false;
}

// Helper function to generate a title
function getStepTitle(e) {
  const target = e.target;
  let title = `Clicked on a ${target.tagName.toLowerCase()}`;
  
  // If the element is sensitive, use a generic title
  if (isSensitive(target)) {
    return "Clicked on a **Sensitive Data Field**";
  }

  // Get more specific text if available (for non-sensitive fields)
  const innerText = target.innerText;
  const value = target.value;
  const placeholder = target.placeholder;

  if (innerText) {
    title = `Clicked on "${innerText.substring(0, 40)}"`;
  } else if (value) {
    title = `Clicked on "${value.substring(0, 40)}"`;
  } else if (target.tagName === 'INPUT' && placeholder) {
    title = `Clicked in "${placeholder.substring(0, 40)}" field`;
  }
  
  // Truncate long titles
  if (title.length > 80) {
      title = title.substring(0, 77) + '...';
  }
  
  return title;
}

// Main event listener for clicks
function captureAction(e) {
  // Don't capture clicks inside the recorder's own UI
  if (e.target.id === 'my-extension-highlight-box') return;
  
  // We specifically avoid capturing "change" events here, which are handled separately for input fields.
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  // Generate a smart title
  const title = getStepTitle(e);
  
  // (Awesome Feature): Draw a highlight box
  const rect = e.target.getBoundingClientRect();
  const highlightBox = document.createElement('div');
  highlightBox.id = 'my-extension-highlight-box';
  highlightBox.style.position = 'fixed';
  highlightBox.style.border = '3px solid red';
  highlightBox.style.boxSizing = 'border-box';
  highlightBox.style.top = `${rect.top}px`;
  highlightBox.style.left = `${rect.left}px`;
  highlightBox.style.width = `${rect.width}px`;
  highlightBox.style.height = `${rect.height}px`;
  highlightBox.style.zIndex = '99999';
  document.body.appendChild(highlightBox);

  // Send the title to the background script
  chrome.runtime.sendMessage({
    action: 'captureStep',
    title: title
  });

  // Remove the highlight box after a moment
  setTimeout(() => {
    const box = document.getElementById('my-extension-highlight-box');
    if (box) document.body.removeChild(box);
  }, 300); // 300ms delay
}

// Add the click listener to the entire document
document.addEventListener('click', captureAction, true);

// (Awesome Feature): Add listener for text fields (change event is smarter than keypress)
document.addEventListener('change', (e) => {
  const target = e.target;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    let title;
    
    // *** NEW SECURITY LOGIC ***
    if (isSensitive(target)) {
      title = `Typed into **Sensitive Field** (Value Obscured)`;
    } else {
      // For non-sensitive fields, record the value (truncated)
      const value = target.value.substring(0, 60);
      const fieldName = target.placeholder || target.name || 'a text field';
      title = `Typed "${value}" into "${fieldName.substring(0, 40)}"`;
    }

    chrome.runtime.sendMessage({
      action: 'captureStep',
      title: title
    });
  }
}, true);
