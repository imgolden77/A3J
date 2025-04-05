// Authentication Configuration
const validCredentials = {
    "healthuser": "tracker123",
    "demo": "demo123"
  };
  
  // Enhanced Fallback Data System
  const generateFallbackData = () => ({
    user_id: "u001",
    today: {
      date: new Date().toISOString().split('T')[0],
      heart_rate: 75 + Math.floor(Math.random() * 10),
      sleep_hours: (6 + Math.random() * 2).toFixed(1),
      mood: 3 + Math.floor(Math.random() * 2),
      stress_level: 3 + Math.floor(Math.random() * 2),
      burnout_risk: 50 + Math.floor(Math.random() * 20)
    },
    history: {
      dates: Array.from({length: 30}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - 30 + i);
        return d.toISOString().split('T')[0];
      }),
      heart_rate: Array.from({length: 30}, () => 70 + Math.floor(Math.random() * 15)),
      sleep_hours: Array.from({length: 30}, () => 5 + Math.random() * 3).map(n => parseFloat(n.toFixed(1))),
      mood: Array.from({length: 30}, () => 2 + Math.floor(Math.random() * 3)),
      stress_level: Array.from({length: 30}, () => 2 + Math.floor(Math.random() * 3)),
      burnout_scores: Array.from({length: 30}, () => 30 + Math.floor(Math.random() * 40))
    }
  });
  
  // Core Variables
  let healthData;
  let myChart, burnoutChart, hrBurnoutChart, sleepBurnoutChart;
  
  // Page Management
  function showPage(page) {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("dashboardPage").style.display = "none";
    document.getElementById("analysisPage").style.display = "none";
    
    const targetPage = document.getElementById(page + "Page");
    targetPage.style.display = "block";
  
    if (page === "dashboard") {
      document.getElementById("loadingState").classList.remove("d-none");
      fetchData().finally(() => {
        document.getElementById("loadingState").classList.add("d-none");
      });
    }
    
    if (page === "analysis" && healthData) {
      initAnalysisPage();
    }
  }
  
  // Enhanced Login Handler
  function handleLogin(event) {
    event.preventDefault();
    const username = document.querySelector("#loginPage input[type='text']").value.trim();
    const password = document.querySelector("#loginPage input[type='password']").value.trim();
    
    if (validCredentials[username] === password) {
      localStorage.setItem('loggedIn', true);
      showPage('dashboard');
    } else {
      alert("Invalid credentials. Try:\n• demo/demo123\n• healthuser/tracker123");
    }
  }
  
  // Robust Data Management
  async function fetchData() {
    try {
      const res = await fetch(`data/health_data.json?t=${Date.now()}`);
      
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }
      
      const rawData = await res.json();
      
      // Data Validation
      if (!rawData.history || rawData.history.dates?.length !== 30) {
        throw new Error("Invalid data format: Requires 30 days of history");
      }
      
      healthData = {
        ...rawData,
        today: {
          heart_rate: parseInt(rawData.today.heart_rate),
          sleep_hours: parseFloat(rawData.today.sleep_hours),
          mood: parseInt(rawData.today.mood),
          stress_level: parseInt(rawData.today.stress_level),
          burnout_risk: parseInt(rawData.today.burnout_risk)
        }
      };
      
      updateDashboard();
      
    } catch (error) {
      console.error("Data Error:", error);
      healthData = generateFallbackData();
      updateDashboard();
      showDataError();
    }
  }
  
  function updateDashboard() {
    const today = healthData.today;
    
    document.getElementById("heart_rate_value").textContent = 
      `${today.heart_rate} BPM`;
    document.getElementById("sleep_hours_value").textContent = 
      `${today.sleep_hours} hrs`;
    document.getElementById("mood_value").textContent = 
      `${today.mood}/5`;
    document.getElementById("stress_level_value").textContent = 
      `${today.stress_level}/5`;
  }
  
  function showDataError() {
    const dashboard = document.getElementById("dashboardPage");
    const existingAlert = dashboard.querySelector('.alert');
    
    if (!existingAlert) {
      dashboard.insertAdjacentHTML('beforeend', `
        <div class="alert alert-danger mt-3">
          Data Error - Using Demo Data. 
          <button onclick="forceRefresh()" class="btn btn-link">Retry</button>
        </div>
      `);
    }
  }
  
  function forceRefresh() {
    document.getElementById("loadingState").classList.remove("d-none");
    fetchData().finally(() => {
      document.getElementById("loadingState").classList.add("d-none");
    });
  }
  
  // Chart Management System
  function showChart(metric) {
    if (!healthData.history[metric]) {
      alert("Data not available for this metric");
      return;
    }
  
    const ctx = document.getElementById("chartCanvas").getContext("2d");
    
    if (myChart) myChart.destroy();
  
    myChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: healthData.history.dates,
        datasets: [{
          label: `${metric.replace(/_/g, ' ').toUpperCase()} (Last 30 Days)`,
          data: healthData.history[metric],
          borderColor: "#6d66f7",
          backgroundColor: "rgba(109,102,247,0.2)",
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: metric !== "heart_rate",
            title: {
              display: true,
              text: metric === "heart_rate" ? "BPM" : "Score"
            }
          }
        }
      }
    });
  
    document.getElementById("chartModal").style.display = "block";
  }
  
  // Burnout Analysis Engine
  function calculateBurnout() {
    const inputs = {
      currentFeel: Math.min(5, Math.max(1, parseInt(document.getElementById('currentFeel').value))),
      dayFeel: Math.min(5, Math.max(1, parseInt(document.getElementById('dayFeel').value))),
      maxStress: Math.min(5, Math.max(1, parseInt(document.getElementById('maxStress').value))),
      sleepQuality: Math.min(5, Math.max(1, parseInt(document.getElementById('sleepQuality').value))),
      motivation: Math.min(5, Math.max(1, parseInt(document.getElementById('motivation').value)))
    };
  
    const weights = {
      maxStress: 40,
      sleepQuality: 25,
      dayFeel: 20,
      currentFeel: 10,
      motivation: 5
    };
  
    const burnoutScore = Math.min(100, Math.max(0, 
      (inputs.maxStress * weights.maxStress) +
      ((5 - inputs.sleepQuality) * weights.sleepQuality) +
      ((5 - inputs.dayFeel) * weights.dayFeel) +
      ((5 - inputs.currentFeel) * weights.currentFeel) +
      ((5 - inputs.motivation) * weights.motivation)
    ));
  
    // Update UI
    document.getElementById('burnoutScore').textContent = `${burnoutScore}/100`;
    document.getElementById('burnoutGauge').style.width = `${burnoutScore}%`;
    
    // Update Data
    healthData.history.burnout_scores = [
      ...healthData.history.burnout_scores.slice(1),
      burnoutScore
    ];
    
    healthData.today.burnout_risk = burnoutScore;
    
    // Refresh Visualizations
    updateBurnoutChart();
    updateCorrelationCharts();
  }
  
  function updateBurnoutChart() {
    const ctx = document.getElementById('burnoutChart').getContext('2d');
    
    if(burnoutChart) burnoutChart.destroy();
  
    burnoutChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: healthData.history.dates,
        datasets: [{
          label: 'Burnout Risk Score',
          data: healthData.history.burnout_scores,
          borderColor: '#ff6384',
          backgroundColor: 'rgba(255,99,132,0.2)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        scales: {
          y: { 
            min: 0, 
            max: 100,
            title: {
              display: true,
              text: 'Burnout Risk Score'
            }
          }
        }
      }
    });
  }
  
  function updateCorrelationCharts() {
    // Heart Rate vs Burnout
    const hrCtx = document.getElementById('hrBurnoutChart').getContext('2d');
    if(hrBurnoutChart) hrBurnoutChart.destroy();
    hrBurnoutChart = new Chart(hrCtx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Heart Rate vs Burnout',
          data: healthData.history.heart_rate.map((hr, i) => ({
            x: hr,
            y: healthData.history.burnout_scores[i]
          })),
          backgroundColor: '#6d66f7'
        }]
      },
      options: {
        scales: {
          x: { 
            title: { 
              display: true, 
              text: 'Heart Rate (BPM)' 
            } 
          },
          y: { 
            title: { 
              display: true, 
              text: 'Burnout Score' 
            } 
          }
        }
      }
    });
  
    // Sleep vs Burnout
    const sleepCtx = document.getElementById('sleepBurnoutChart').getContext('2d');
    if(sleepBurnoutChart) sleepBurnoutChart.destroy();
    sleepBurnoutChart = new Chart(sleepCtx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Sleep vs Burnout',
          data: healthData.history.sleep_hours.map((sleep, i) => ({
            x: sleep,
            y: healthData.history.burnout_scores[i]
          })),
          backgroundColor: '#4caf50'
        }]
      },
      options: {
        scales: {
          x: { 
            title: { 
              display: true, 
              text: 'Sleep Hours' 
            } 
          },
          y: { 
            title: { 
              display: true, 
              text: 'Burnout Score' 
            } 
          }
        }
      }
    });
  }
  
  // Analysis Initialization
  function initAnalysisPage() {
    document.getElementById('burnoutScore').textContent = 
      `${healthData.today.burnout_risk}/100`;
    document.getElementById('burnoutGauge').style.width = 
      `${healthData.today.burnout_risk}%`;
    
    updateBurnoutChart();
    updateCorrelationCharts();
  }
  
  // App Initialization
  function initializeApp() {
    if(localStorage.getItem('loggedIn')) {
        showPage('dashboard');
    } else {
      showPage('login');
    }
    
    // Initialize with fallback data if needed
    if(!healthData) {
      healthData = generateFallbackData();
    }
  }
  
  // Event Listeners
  window.addEventListener('DOMContentLoaded', initializeApp);
  
  // Utility Functions
  function validateNumber(value, min, max) {
    return Math.min(max, Math.max(min, Number(value)));
  }
  
  // Auto-save Burnout Inputs
  function autoSaveInputs() {
    const inputs = {
      currentFeel: document.getElementById('currentFeel').value,
      dayFeel: document.getElementById('dayFeel').value,
      maxStress: document.getElementById('maxStress').value,
      sleepQuality: document.getElementById('sleepQuality').value,
      motivation: document.getElementById('motivation').value
    };
    localStorage.setItem('burnoutInputs', JSON.stringify(inputs));
  }
  
  function loadSavedInputs() {
    const savedInputs = JSON.parse(localStorage.getItem('burnoutInputs')) || {};
    document.getElementById('currentFeel').value = savedInputs.currentFeel || 3;
    document.getElementById('dayFeel').value = savedInputs.dayFeel || 3;
    document.getElementById('maxStress').value = savedInputs.maxStress || 3;
    document.getElementById('sleepQuality').value = savedInputs.sleepQuality || 3;
    document.getElementById('motivation').value = savedInputs.motivation || 3;
  }
  
  // Add input event listeners for auto-save
  document.querySelectorAll('#analysisPage input[type="range"]').forEach(input => {
    input.addEventListener('input', autoSaveInputs);
  });
  
  // Initial Load of Saved Inputs
  if(document.getElementById('analysisPage')) {
    loadSavedInputs();
  }
  
  // Chart Modal Close Handling
  document.getElementById('chartModal').addEventListener('click', function(e) {
    if(e.target === this) {
      this.style.display = 'none';
    }
  });
  
  // Session Management
  function logout() {
    localStorage.removeItem('loggedIn');
    showPage('login');
  }
  
  // Add logout button functionality
  document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Logout';
    logoutBtn.classList.add('btn', 'btn-danger', 'position-fixed', 'bottom-0', 'm-3');
    logoutBtn.onclick = logout;
    document.body.appendChild(logoutBtn);
  });
  
  // Data Export Functionality
  function exportData() {
    const blob = new Blob([JSON.stringify(healthData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  // Add Export Button
  document.addEventListener('DOMContentLoaded', function() {
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export Data';
    exportBtn.classList.add('btn', 'btn-success', 'position-fixed', 'bottom-0', 'end-0', 'm-3');
    exportBtn.onclick = exportData;
    document.body.appendChild(exportBtn);
  });
  
  // Data Import Handling
  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file && file.type === "application/json") {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const importedData = JSON.parse(e.target.result);
  
          // Validate basic structure
          if (!importedData.today || !importedData.history || !Array.isArray(importedData.history.dates)) {
            throw new Error("Invalid health data format.");
          }
  
          healthData = importedData;
          alert("Data imported successfully!");
  
          // Refresh UI
          updateDashboard();
          if (document.getElementById("analysisPage").style.display === "block") {
            initAnalysisPage();
          }
        } catch (err) {
          alert("Failed to import data: " + err.message);
          console.error("Import Error:", err);
        }
      };
      reader.readAsText(file);
    } else {
      alert("Please upload a valid JSON file.");
    }
  }
  
  
  // Add Import Functionality
  document.addEventListener('DOMContentLoaded', function () {
    // Hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', handleFileUpload);
    document.body.appendChild(fileInput);
  
    // Import button
    const importBtn = document.createElement('button');
    importBtn.textContent = 'Import Data';
    importBtn.classList.add('btn', 'btn-primary', 'position-fixed', 'bottom-0', 'start-0', 'm-3');
    importBtn.onclick = () => fileInput.click();
    document.body.appendChild(importBtn);
  });
  
  
  // Responsive Chart Handling
  window.addEventListener('resize', () => {
    if(myChart) myChart.resize();
    if(burnoutChart) burnoutChart.resize();
    if(hrBurnoutChart) hrBurnoutChart.resize();
    if(sleepBurnoutChart) sleepBurnoutChart.resize();
  });
  
  // Data Validation Helpers
  function validateDataStructure(data) {
    const requiredFields = [
      'user_id',
      'today.heart_rate',
      'today.sleep_hours',
      'today.mood',
      'today.stress_level',
      'today.burnout_risk',
      'history.dates',
      'history.heart_rate',
      'history.sleep_hours',
      'history.mood',
      'history.stress_level',
      'history.burnout_scores'
    ];
  
    for(const field of requiredFields) {
      const parts = field.split('.');
      let current = data;
      for(const part of parts) {
        if(!current[part]) return false;
        current = current[part];
      }
    }
    return true;
  }
  
  // Enhanced Error Reporting
  function showError(message, isFatal = false) {
    const errorDiv = document.createElement('div');
    errorDiv.className = `alert alert-${isFatal ? 'danger' : 'warning'} position-fixed top-0 start-0 m-3`;
    errorDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(errorDiv);
    
    if(isFatal) {
      setTimeout(() => errorDiv.remove(), 10000);
    }
  }
  
  // Data Sanitization
  function sanitizeHealthData(data) {
    return {
      user_id: data.user_id,
      today: {
        date: data.today.date || new Date().toISOString().split('T')[0],
        heart_rate: validateNumber(data.today.heart_rate, 40, 120),
        sleep_hours: validateNumber(data.today.sleep_hours, 0, 24),
        mood: validateNumber(data.today.mood, 1, 5),
        stress_level: validateNumber(data.today.stress_level, 1, 5),
        burnout_risk: validateNumber(data.today.burnout_risk, 0, 100)
      },
      history: {
        dates: data.history.dates,
        heart_rate: data.history.heart_rate.map(v => validateNumber(v, 40, 120)),
        sleep_hours: data.history.sleep_hours.map(v => validateNumber(v, 0, 24)),
        mood: data.history.mood.map(v => validateNumber(v, 1, 5)),
        stress_level: data.history.stress_level.map(v => validateNumber(v, 1, 5)),
        burnout_scores: data.history.burnout_scores.map(v => validateNumber(v, 0, 100))
      }
    };
  }
  
  // Enhanced Data Loading
  async function enhancedFetchData() {
    try {
      const res = await fetch(`data/health_data.json?t=${Date.now()}`);
      
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }
      
      const rawData = await res.json();
      
      if (!validateDataStructure(rawData)) {
        throw new Error("Invalid data structure");
      }
      
      healthData = sanitizeHealthData(rawData);
      updateDashboard();
      
    } catch (error) {
      console.error("Data Loading Error:", error);
      healthData = sanitizeHealthData(generateFallbackData());
      updateDashboard();
      showError(`Data Error: ${error.message} - Using demo data`, true);
    }
  }
  
  // Replace original fetchData with enhanced version
  window.fetchData = enhancedFetchData;
  
  // Final Initialization
  document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  
    // Initialize charts if on analysis page
    if(document.getElementById('analysisPage').style.display === 'block') {
      initAnalysisPage();
    }
  });
  