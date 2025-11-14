document.getElementById('startBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'start' });
  window.close(); // Close the popup after clicking
});

document.getElementById('stopBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'stop' });
  window.close();
});
