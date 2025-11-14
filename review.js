document.addEventListener('DOMContentLoaded', () => {
  const stepsContainer = document.getElementById('steps-container');
  const exportHtmlBtn = document.getElementById('export-html');
  const exportMdBtn = document.getElementById('export-md');
  const guideNameInput = document.getElementById('guide-name-input'); // NEW: Reference to the input
  let sortable; 

  // 1. Main function to load and render steps
  async function loadAndRenderSteps() {
    const data = await chrome.storage.local.get('steps');
    const steps = data.steps || [];
    renderSteps(steps);
  }

  // 2. Function to render the steps array into HTML (No change here)
  function renderSteps(steps) {
    stepsContainer.innerHTML = ''; 

    if (steps.length === 0) {
      stepsContainer.innerHTML = '<p style="text-align: center; color: #777;">No steps recorded yet.</p>';
      return;
    }

    steps.forEach((step, index) => {
      const stepCard = document.createElement('div');
      stepCard.className = 'step-card';
      stepCard.setAttribute('data-index', index); 

      stepCard.innerHTML = `
        <span class="drag-handle" title="Drag to re-order">⠿</span>
        <div class="step-content">
          <div class="screenshot-wrapper">
            <span class="step-number">Step ${index + 1}</span>
            <img src="${step.screenshot}" alt="Screenshot for step ${index + 1}">
          </div>
          <div class="edit-area">
            <input type="text" class="edit-title" value="${escapeHTML(step.title)}" data-index="${index}" title="Edit title">
            <textarea class="edit-desc" data-index="${index}" title="Edit description" placeholder="Add a description...">${escapeHTML(step.description)}</textarea>
          </div>
        </div>
        <button class="delete-btn" data-index="${index}" title="Delete step">&times;</button>
      `;
      stepsContainer.appendChild(stepCard);
    });

    addEventListeners();
    
    if (sortable) sortable.destroy(); 
    sortable = new Sortable(stepsContainer, {
      animation: 150,
      handle: '.drag-handle', 
      onEnd: handleDragEnd,
    });
  }

  // 3. Add listeners for inputs and buttons (No change here)
  function addEventListeners() {
    document.querySelectorAll('.edit-title').forEach(input => {
      input.addEventListener('change', saveStepChange);
    });

    document.querySelectorAll('.edit-desc').forEach(textarea => {
      textarea.addEventListener('change', saveStepChange);
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', deleteStep);
    });
  }

  // 4. Handle saving changes to storage (No change here)
  async function saveStepChange(event) {
    const index = parseInt(event.target.getAttribute('data-index'));
    const data = await chrome.storage.local.get('steps');
    const steps = data.steps || [];

    if (event.target.classList.contains('edit-title')) {
      steps[index].title = event.target.value;
    } else if (event.target.classList.contains('edit-desc')) {
      steps[index].description = event.target.value;
    }

    await chrome.storage.local.set({ steps: steps });
  }

  // 5. Handle deleting a step (No change here)
  async function deleteStep(event) {
    if (!confirm('Are you sure you want to delete this step?')) {
      return;
    }
    const index = parseInt(event.currentTarget.getAttribute('data-index'));
    const data = await chrome.storage.local.get('steps');
    let steps = data.steps || [];

    steps.splice(index, 1); 

    await chrome.storage.local.set({ steps: steps });
    renderSteps(steps); 
  }
  
  // 6. Handle drag-and-drop re-ordering (No change here)
  async function handleDragEnd(event) {
    const { oldIndex, newIndex } = event;
    
    const data = await chrome.storage.local.get('steps');
    let steps = data.steps || [];
    
    const [movedItem] = steps.splice(oldIndex, 1);
    steps.splice(newIndex, 0, movedItem);
    
    await chrome.storage.local.set({ steps: steps });
    renderSteps(steps); 
  }

  // 7. Export Listeners
  exportHtmlBtn.addEventListener('click', () => generateExport('html'));
  exportMdBtn.addEventListener('click', () => generateExport('md'));

  async function generateExport(format) {
    const data = await chrome.storage.local.get('steps');
    const steps = data.steps || [];
    
    // NEW: Get the custom name and sanitize it for the filename
    const rawName = guideNameInput.value.trim() || 'How-To-Guide';
    // Remove characters that might break filenames (slashes, colons, etc.)
    const safeName = rawName.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-'); 
    
    let fileContent = '';
    let filename = '';
    let mimeType = '';

    if (format === 'html') {
      fileContent = generateHTML(steps, rawName); // Pass the raw name to HTML generator
      filename = `${safeName}.html`;
      mimeType = 'text/html';
    } else { // markdown
      fileContent = generateMarkdown(steps, rawName); // Pass the raw name to MD generator
      filename = `${safeName}.md`;
      mimeType = 'text/markdown';
    }
    
    downloadFile(fileContent, filename, mimeType);
  }

  // 8. Generate HTML content (UPDATED to accept and use the name)
  function generateHTML(steps, guideName) {
    let html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${escapeHTML(guideName)}</title>
        <style>
          body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 20px auto; padding: 20px; }
          .step { margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
          h2 { color: #333; }
          p { color: #555; }
          img { max-width: 100%; height: auto; border: 1px solid #ccc; border-radius: 8px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <h1>${escapeHTML(guideName)}</h1>
    `;

    steps.forEach((step, index) => {
      html += `
        <div class="step">
          <h2>Step ${index + 1}: ${escapeHTML(step.title)}</h2>
          <p>${escapeHTML(step.description).replace(/\n/g, '<br>')}</p>
          <img src="${step.screenshot}" alt="Screenshot for ${escapeHTML(step.title)}">
        </div>
      `;
    });

    html += `</body></html>`;
    return html;
  }

  // 9. Generate Markdown content (UPDATED to accept and use the name)
  function generateMarkdown(steps, guideName) {
    let md = `# ${guideName}\n\n`;
    steps.forEach((step, index) => {
      md += `## Step ${index + 1}: ${step.title}\n\n`;
      if (step.description) {
        md += `${step.description}\n\n`;
      }
      md += `![${step.title}](${step.screenshot})\n\n`;
      md += `---\n\n`;
    });
    return md;
  }

  // 10. Helper function to trigger a file download (No change here)
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  // 11. Helper to escape HTML for security (No change here)
  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
    });
  }

  // Initial load
  loadAndRenderSteps();
});
