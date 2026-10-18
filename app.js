let records = [];
let debts = [];
let apiKey = localStorage.getItem('sf_gemini_key') || '';

try {
  const savedTxs = localStorage.getItem('sf_records');
  if (savedTxs) records = JSON.parse(savedTxs);

  const savedDebts = localStorage.getItem('sf_debts');
  if (savedDebts) debts = JSON.parse(savedDebts);
} catch (e) {
  console.log("Storage load error", e);
}

const toRupees = (paise) => (paise / 100).toLocaleString('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2
});

const toPaise = (val) => Math.round(parseFloat(val) * 100);

const themeBtn = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('sf_theme') || 'dark';

document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

themeBtn.onclick = () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('sf_theme', next);
  updateThemeIcon(next);
};

function updateThemeIcon(t) {
  themeBtn.textContent = t === 'dark' ? '☀️' : '🌙';
}

function getSummary() {
  let inc = 0, exp = 0, inv = 0;

  for (let i = 0; i < records.length; i++) {
    const item = records[i];
    if (item.type === 'income') inc += item.paise;
    else if (item.type === 'expense') exp += item.paise;
    else if (item.type === 'investment') inv += item.paise;
  }

  const totalDebt = debts.reduce((sum, d) => sum + d.paise, 0);
  return { inc, exp, inv, totalDebt };
}

function calculateLoanEmi() {
  const p = parseFloat(document.getElementById('loanPrincipal').value) || 0;
  const annualRate = parseFloat(document.getElementById('loanInterest').value) || 0;
  const tenureYears = parseFloat(document.getElementById('loanTenure').value) || 1;

  const r = (annualRate / 12) / 100;
  const n = tenureYears * 12;

  if (p > 0 && r > 0 && n > 0) {
    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalAmount = emi * n;
    const totalInterest = totalAmount - p;

    document.getElementById('calcEmiResult').textContent = toRupees(toPaise(emi));
    document.getElementById('calcTotalInterest').textContent = toRupees(toPaise(totalInterest));
  } else {
    document.getElementById('calcEmiResult').textContent = '₹0.00';
    document.getElementById('calcTotalInterest').textContent = '₹0.00';
  }
}

function updateSip() {
  const p = parseFloat(document.getElementById('sipAmount').value) || 0;
  const r = parseFloat(document.getElementById('sipRate').value) || 0;
  const y = parseInt(document.getElementById('sipYears').value) || 1;

  document.getElementById('yearsVal').textContent = `${y} Years`;

  const monthlyRate = (r / 12) / 100;
  const months = y * 12;

  const totalInvested = p * months;
  const fv = p * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);

  document.getElementById('totalInvested').textContent = toRupees(toPaise(totalInvested));
  document.getElementById('futureValue').textContent = toRupees(toPaise(fv));
}

function refreshUI() {
  const summary = getSummary();
  document.getElementById('incDisplay').textContent = toRupees(summary.inc);
  document.getElementById('expDisplay').textContent = toRupees(summary.exp);
  document.getElementById('invDisplay').textContent = toRupees(summary.inv);
  document.getElementById('debtDisplay').textContent = toRupees(summary.totalDebt);

  const tableBody = document.getElementById('txTableBody');
  const currentFilter = document.getElementById('filterSelect').value;
  const items = records.filter(r => currentFilter === 'all' ? true : r.type === currentFilter);

  if (items.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 15px;">No transactions recorded.</td></tr>`;
  } else {
    tableBody.innerHTML = items.map(r => {
      let col = r.type === 'income' ? 'green' : (r.type === 'investment' ? 'blue' : 'red');
      let sign = r.type === 'income' ? '+' : (r.type === 'expense' ? '-' : '');
      return `
        <tr>
          <td>${r.date}</td>
          <td>${r.title}</td>
          <td>${r.category}</td>
          <td style="text-transform: capitalize;">${r.type}</td>
          <td class="${col}">${sign}${toRupees(r.paise)}</td>
          <td><button class="delete-link" onclick="removeEntry(${r.id})">Delete</button></td>
        </tr>
      `;
    }).join('');
  }

  const debtBody = document.getElementById('debtTableBody');
  if (debts.length === 0) {
    debtBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 15px;">No active loan or credit card dues logged.</td></tr>`;
  } else {
    const today = new Date();
    debtBody.innerHTML = debts.map(d => {
      const dueDate = new Date(d.dueDate);
      const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      const badge = diffDays <= 5 
        ? `<span class="badge urgent">Due in ${diffDays}d</span>` 
        : `<span class="badge normal">Upcoming (${diffDays}d)</span>`;

      return `
        <tr>
          <td>${d.dueDate}</td>
          <td><strong>${d.title}</strong></td>
          <td>${d.type}</td>
          <td class="red">${toRupees(d.paise)}</td>
          <td>${badge}</td>
          <td><button class="delete-link" onclick="removeDebt(${d.id})">Mark Paid</button></td>
        </tr>
      `;
    }).join('');
  }
}

document.getElementById('txForm').addEventListener('submit', (e) => {
  e.preventDefault();

  records.unshift({
    id: Date.now(),
    title: document.getElementById('desc').value.trim(),
    paise: toPaise(document.getElementById('amount').value),
    type: document.getElementById('txType').value,
    category: document.getElementById('category').value,
    date: document.getElementById('date').value
  });

  localStorage.setItem('sf_records', JSON.stringify(records));
  e.target.reset();
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
  refreshUI();
});

document.getElementById('debtForm').addEventListener('submit', (e) => {
  e.preventDefault();

  debts.push({
    id: Date.now(),
    title: document.getElementById('debtTitle').value.trim(),
    paise: toPaise(document.getElementById('debtAmount').value),
    type: document.getElementById('debtType').value,
    dueDate: document.getElementById('debtDueDate').value
  });

  localStorage.setItem('sf_debts', JSON.stringify(debts));
  e.target.reset();
  document.getElementById('debtDueDate').value = new Date().toISOString().split('T')[0];
  refreshUI();
});

window.removeEntry = function(id) {
  records = records.filter(r => r.id !== id);
  localStorage.setItem('sf_records', JSON.stringify(records));
  refreshUI();
};

window.removeDebt = function(id) {
  debts = debts.filter(d => d.id !== id);
  localStorage.setItem('sf_debts', JSON.stringify(debts));
  refreshUI();
};

document.getElementById('filterSelect').addEventListener('change', refreshUI);

['sipAmount', 'sipRate', 'sipYears'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateSip);
});
['loanPrincipal', 'loanInterest', 'loanTenure'].forEach(id => {
  document.getElementById(id).addEventListener('input', calculateLoanEmi);
});

const aiDrawer = document.getElementById('aiDrawer');
const keyModal = document.getElementById('keyModal');
const emiCalcModal = document.getElementById('emiCalcModal');

document.getElementById('aiAdvisorBtn').onclick = () => aiDrawer.classList.remove('hidden');
document.getElementById('closeDrawerBtn').onclick = () => aiDrawer.classList.add('hidden');

document.getElementById('apiKeyBtn').onclick = () => keyModal.classList.remove('hidden');
document.getElementById('closeModalBtn').onclick = () => keyModal.classList.add('hidden');

document.getElementById('calcModalBtn').onclick = () => {
  emiCalcModal.classList.remove('hidden');
  calculateLoanEmi();
};
document.getElementById('closeCalcBtn').onclick = () => emiCalcModal.classList.add('hidden');

document.getElementById('saveKeyBtn').onclick = () => {
  const key = document.getElementById('userKeyInput').value.trim();
  if (key) {
    apiKey = key;
    localStorage.setItem('sf_gemini_key', key);
    keyModal.classList.add('hidden');
  }
};

document.getElementById('analyzeBtn').onclick = async () => {
  if (!apiKey) {
    keyModal.classList.remove('hidden');
    return;
  }

  const { inc, exp, inv, totalDebt } = getSummary();
  const debtsList = debts.map(d => `- ${d.title} (${d.type}): ₹${d.paise / 100} due on ${d.dueDate}`).join('\n');
  const recentLogs = records.slice(0, 6).map(r => `- ${r.title} (${r.type}): ₹${r.paise / 100}`).join('\n');

  const prompt = `Act as ShieldFinance AI, a direct and practical personal finance advisor.
Analyze this profile:
- Monthly Income: ₹${inc / 100}
- Regular Expenses: ₹${exp / 100}
- Monthly Investments (SIP): ₹${inv / 100}
- Total Debt/Credit Liabilities: ₹${totalDebt / 100}

Debts & Dues:
${debtsList || "None"}

Recent Transactions:
${recentLogs || "None"}

Give 3 brief, actionable points:
1. Quick assessment of cash flow vs debt burden.
2. Direct advice on managing credit card/EMI dues.
3. Suggestion on whether to prioritize SIP or debt repayment.
Keep it direct, honest, and under 130 words.`;

  const loader = document.getElementById('loader');
  const output = document.getElementById('advisorOutput');

  loader.classList.remove('hidden');
  output.textContent = '';

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await res.json();
    if (data.candidates && data.candidates[0]) {
      output.textContent = data.candidates[0].content.parts[0].text;
    } else {
      output.textContent = data.error?.message || "Could not retrieve response.";
    }
  } catch (err) {
    output.textContent = "Request error: " + err.message;
  } finally {
    loader.classList.add('hidden');
  }
};

document.getElementById('date').value = new Date().toISOString().split('T')[0];
document.getElementById('debtDueDate').value = new Date().toISOString().split('T')[0];
refreshUI();
updateSip();
calculateLoanEmi();