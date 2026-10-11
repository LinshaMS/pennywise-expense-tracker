import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import './App.css';

type Transaction = {
  id: number;
  title: string;
  category: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
};

const STORAGE_KEY = 'expense-tracker-transactions';

const initialTransactions: Transaction[] = [];

const categories = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Entertainment',
  'Health',
  'Education',
  'Salary',
  'Freelance',
  'Other',
];

const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);

function getSavedTransactions(): Transaction[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed as Transaction[];
    }
  } catch (error) {
    console.error('Could not load saved transactions:', error);
  }

  return initialTransactions;
}

function App() {
  const [transactions, setTransactions] =
    useState<Transaction[]>(getSavedTransactions);

  const [budget, setBudget] = useState<number>(() => {
    const savedBudget = localStorage.getItem('expense-tracker-budget');
    return savedBudget ? Number(savedBudget) : 0;
  });

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  // Save transactions whenever they change.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(transactions),
      );
    } catch (error) {
      console.error('Could not save transactions:', error);
    }
  }, [transactions]);

  // Save the budget whenever it changes.
  useEffect(() => {
    try {
      localStorage.setItem(
        'expense-tracker-budget',
        budget.toString(),
      );
    } catch (error) {
      console.error('Could not save budget:', error);
    }
  }, [budget]);

  const income = transactions
    .filter((item) => item.type === 'income')
    .reduce((total, item) => total + item.amount, 0);

  const expenses = transactions
    .filter((item) => item.type === 'expense')
    .reduce((total, item) => total + item.amount, 0);

  const balance = income - expenses;

  // Calculate this month's expenses.
  const currentMonth = new Date().toISOString().slice(0, 7);

  const monthlyExpenses = transactions
    .filter(
      (item) =>
        item.type === 'expense' &&
        item.date.slice(0, 7) === currentMonth,
    )
    .reduce((total, item) => total + item.amount, 0);

  const remainingBudget = budget - monthlyExpenses;

  const budgetProgress =
    budget > 0
      ? Math.min((monthlyExpenses / budget) * 100, 100)
      : 0;

  const filteredTransactions = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return transactions
      .filter((item) => {
        const matchesSearch =
          item.title.toLowerCase().includes(searchText) ||
          item.category.toLowerCase().includes(searchText);

        const matchesFilter =
          filter === 'All' ||
          (filter === 'Income' && item.type === 'income') ||
          (filter === 'Expenses' && item.type === 'expense') ||
          item.category === filter;

        return matchesSearch && matchesFilter;
      })
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) || b.id - a.id,
      );
  }, [transactions, search, filter]);

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};

    transactions
      .filter((item) => item.type === 'expense')
      .forEach((item) => {
        totals[item.category] =
          (totals[item.category] || 0) + item.amount;
      });

    return Object.entries(totals)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  }, [transactions]);

  const maxCategoryTotal = Math.max(
    ...categoryTotals.map((item) => item.total),
    1,
  );

  const monthlyData = useMemo(() => {
    const now = new Date();

    const months = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(
        now.getFullYear(),
        now.getMonth() - 5 + index,
        1,
      );

      return {
        key: `${monthDate.getFullYear()}-${String(
          monthDate.getMonth() + 1,
        ).padStart(2, '0')}`,
        month: monthDate.toLocaleDateString('en-IN', {
          month: 'short',
        }),
        income: 0,
        expenses: 0,
      };
    });

    transactions.forEach((item) => {
      const month = months.find(
        (entry) => entry.key === item.date.slice(0, 7),
      );

      if (!month) return;

      if (item.type === 'income') {
        month.income += item.amount;
      } else {
        month.expenses += item.amount;
      }
    });

    return months;
  }, [transactions]);

  const totalMonthlyIncome = monthlyData.reduce(
    (total, month) => total + month.income,
    0,
  );

  const addTransaction = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (
      !title.trim() ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      !date
    ) {
      alert('Enter a transaction name, a valid amount, and a date.');
      return;
    }

    const newTransaction: Transaction = {
      id: Date.now(),
      title: title.trim(),
      category,
      amount: numericAmount,
      date,
      type,
    };

    setTransactions((previous) => [
      ...previous,
      newTransaction,
    ]);

    setTitle('');
    setAmount('');
    setCategory('Food');
    setType('expense');
    setDate(new Date().toISOString().slice(0, 10));
    setShowForm(false);
  };

  const deleteTransaction = (id: number) => {
    if (!window.confirm('Delete this transaction?')) return;

    setTransactions((previous) =>
      previous.filter((item) => item.id !== id),
    );
  };

  const resetDemo = () => {
    if (
      !window.confirm(
        'Reset transactions to the original demo data?',
      )
    ) {
      return;
    }

    setTransactions(initialTransactions);
    setSearch('');
    setFilter('All');
    setShowForm(false);
  };

  const navigateTo = (section: string) =>
    setActiveSection(section);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#dashboard"
          onClick={() => navigateTo('dashboard')}
        >
          <span className="brand-mark">p.</span>
          <span className="brand-name">pennywise</span>
        </a>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="navigation">
          <a
            className={`nav-link ${
              activeSection === 'dashboard' ? 'active' : ''
            }`}
            href="#dashboard"
            onClick={() => navigateTo('dashboard')}
          >
            <span className="nav-icon">▦</span> Dashboard
          </a>

          <a
            className={`nav-link ${
              activeSection === 'transactions' ? 'active' : ''
            }`}
            href="#transactions"
            onClick={() => navigateTo('transactions')}
          >
            <span className="nav-icon">↔</span> Transactions
          </a>

          <a
            className={`nav-link ${
              activeSection === 'analytics' ? 'active' : ''
            }`}
            href="#monthly-report"
            onClick={() => navigateTo('analytics')}
          >
            <span className="nav-icon">▥</span> Analytics
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon">✳</span>
            <p className="tip-title">Little steps add up.</p>
            <p className="tip-description">
              Keep track of your spending and make your money work
              for you.
            </p>
          </div>

          <div className="profile">
            <div className="profile-avatar">P</div>
            <div className="profile-details">
              <strong>My Workspace</strong>
              <span>Personal account</span>
            </div>
            <button
              className="profile-menu"
              type="button"
              onClick={resetDemo}
              title="Reset demo transactions"
              aria-label="Reset demo transactions"
            >
              ···
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="page-header">
          <div>
            <p className="eyebrow">
              YOUR FINANCES, AT A GLANCE
            </p>
            <h1>Good things start with clarity.</h1>
            <p className="page-subtitle">
              Here's what's happening with your money.
            </p>
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={() =>
              setShowForm((previous) => !previous)
            }
          >
            <span>{showForm ? '×' : '+'}</span>
            {showForm ? 'Close form' : 'Add transaction'}
          </button>
        </header>

        <section className="stats-grid">
          <article className="stat-card balance-card">
            <div className="stat-top">
              <span className="stat-label">TOTAL BALANCE</span>
              <span className="stat-icon">↗</span>
            </div>
            <h2>{money(balance)}</h2>
            <p className="stat-footnote">
              Income minus expenses
            </p>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span className="stat-label">TOTAL INCOME</span>
              <span className="stat-icon income-icon">↓</span>
            </div>
            <h2>{money(income)}</h2>
            <p className="stat-footnote">Money coming in</p>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span className="stat-label">TOTAL EXPENSES</span>
              <span className="stat-icon expense-icon">↑</span>
            </div>
            <h2>{money(expenses)}</h2>
            <p className="stat-footnote">Money going out</p>
          </article>
        </section>
{/* Monthly Budget Card */}
<section className="panel budget-panel">
  <div className="budget-heading">
    <div>
      <p className="eyebrow">MONTHLY PLANNING</p>
      <h2>Monthly budget</h2>
      <p>Keep your spending on track this month.</p>
    </div>
    <span className="budget-month">
      {new Date().toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      })}
    </span>
  </div>

  <div className="budget-content">
    <div className="budget-input-area">
      <label htmlFor="monthly-budget">Your spending limit</label>
      <div className="budget-input-wrap">
        <span>₹</span>
        <input
          id="monthly-budget"
          type="number"
          min="0"
          step="100"
          placeholder="Enter budget"
          value={budget === 0 ? '' : budget}
          onChange={(event) => {
            const value = Number(event.target.value);
            setBudget(
              event.target.value === '' || value < 0 ? 0 : value
            );
          }}
        />
      </div>
      <p>Set a limit for your monthly expenses.</p>
    </div>

    <div className="budget-stat">
      <span>Spent this month</span>
      <h3>{money(monthlyExpenses)}</h3>
    </div>

    <div className="budget-stat">
      <span>
        {remainingBudget < 0 ? 'Over budget by' : 'Remaining'}
      </span>
      <h3 className={remainingBudget < 0 ? 'budget-over' : ''}>
        {money(budget > 0 ? Math.abs(remainingBudget) : 0)}
      </h3>
    </div>
  </div>

  <div className="budget-progress-section">
    <div className="budget-progress-labels">
      <span>
        {budget > 0
          ? `${Math.round((monthlyExpenses / budget) * 100)}% used`
          : 'Enter a budget to get started'}
      </span>
      {budget > 0 && monthlyExpenses > budget && (
        <span className="budget-warning">Budget exceeded</span>
      )}
    </div>

    <div
      className="budget-progress-track"
      role="progressbar"
      aria-label="Monthly budget used"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={budgetProgress}
    >
      <div
        className={`budget-progress-fill ${
          budget > 0 && monthlyExpenses > budget ? 'over-limit' : ''
        }`}
        style={{ width: `${budgetProgress}%` }}
      />
    </div>
  </div>
</section>

        {showForm && (
          <section className="panel form-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">NEW ENTRY</p>
                <h2>Add a transaction</h2>
              </div>
            </div>

            <form
              className="transaction-form"
              onSubmit={addTransaction}
            >
              <div className="form-field">
                <label htmlFor="transaction-title">
                  Transaction name
                </label>
                <input
                  id="transaction-title"
                  type="text"
                  placeholder="e.g. Grocery shopping"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="transaction-amount">
                  Amount (₹)
                </label>
                <input
                  id="transaction-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="transaction-type">
                  Transaction type
                </label>
                <select
                  id="transaction-type"
                  value={type}
                  onChange={(event) =>
                    setType(
                      event.target.value as 'income' | 'expense',
                    )
                  }
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="transaction-category">
                  Category
                </label>
                <select
                  id="transaction-category"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value)
                  }
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="transaction-date">Date</label>
                <input
                  id="transaction-date"
                  type="date"
                  value={date}
                  onChange={(event) =>
                    setDate(event.target.value)
                  }
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  type="submit"
                >
                  Save transaction
                </button>
              </div>
            </form>
          </section>
        )}

        <section
          className="panel monthly-panel"
          id="monthly-report"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">FINANCIAL TRENDS</p>
              <h2>Income vs. expenses</h2>
              <p>
                Your monthly money flow over the last six months.
              </p>
            </div>
            <span className="period-badge">6 MONTHS</span>
          </div>

          <div className="monthly-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{
                  top: 15,
                  right: 8,
                  left: 8,
                  bottom: 5,
                }}
                barGap={8}
                barCategoryGap="28%"
              >
                <CartesianGrid
                  stroke="#e2e4d9"
                  strokeDasharray="3 5"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#73796c', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fill: '#858a7e', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                  tickFormatter={(value: number) =>
                    value >= 1000
                      ? `₹${(value / 1000).toFixed(0)}k`
                      : `₹${value}`
                  }
                />
                <Tooltip
                  formatter={(value, name) => [
                    money(Number(value)),
                    name === 'income' ? 'Income' : 'Expenses',
                  ]}
                  contentStyle={{
                    backgroundColor: '#fffef9',
                    border: '1px solid #dedfd3',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  cursor={{ fill: '#e8ecdf' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{
                    fontSize: 11,
                    paddingBottom: 20,
                  }}
                />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#244e36"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={26}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="#b9d86a"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={26}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="monthly-summary">
            <span>Income recorded in this period</span>
            <strong>{money(totalMonthlyIncome)}</strong>
          </div>
        </section>

        <section className="insights-grid" id="analytics">
          <article className="panel chart-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">SPENDING BREAKDOWN</p>
                <h2>Where your money goes</h2>
              </div>
            </div>

            {categoryTotals.length > 0 ? (
              <div className="category-list">
                {categoryTotals.map((item) => (
                  <div className="category-item" key={item.name}>
                    <div className="category-info">
                      <span>{item.name}</span>
                      <strong>{money(item.total)}</strong>
                    </div>
                    <div className="category-track">
                      <div
                        className="category-bar"
                        style={{
                          width: `${
                            (item.total / maxCategoryTotal) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">
                Your expense categories will appear here once you
                add expenses.
              </p>
            )}
          </article>

          <article className="panel insight-card">
            <p className="eyebrow">MONEY SNAPSHOT</p>
            <h2>A little perspective.</h2>
            <p className="insight-description">
              {income > 0
                ? `You've spent ${(
                    (expenses / income) *
                    100
                  ).toFixed(1)}% of your recorded income.`
                : 'Add some income to start understanding your spending.'}
            </p>
            <div className="snapshot-row">
              <span>Income</span>
              <strong>{money(income)}</strong>
            </div>
            <div className="snapshot-row">
              <span>Expenses</span>
              <strong>{money(expenses)}</strong>
            </div>
            <div className="snapshot-row snapshot-total">
              <span>Available balance</span>
              <strong>{money(balance)}</strong>
            </div>
          </article>
        </section>

        <section
          className="panel transactions-panel"
          id="transactions"
        >
          <div className="section-heading transactions-heading">
            <div>
              <p className="eyebrow">YOUR ACTIVITY</p>
              <h2>Recent transactions</h2>
              <p>Keep an eye on where your money moves.</p>
            </div>
            <span className="transaction-count">
              {filteredTransactions.length} RECORD
              {filteredTransactions.length === 1 ? '' : 'S'}
            </span>
          </div>

          <div className="table-controls">
            <div className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search transactions..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                aria-label="Search transactions"
              />
            </div>

            <select
              className="filter-select"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter transactions"
            >
              <option value="All">All transactions</option>
              <option value="Income">Income only</option>
              <option value="Expenses">Expenses only</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="table-wrapper">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>TRANSACTION</th>
                  <th>CATEGORY</th>
                  <th>DATE</th>
                  <th>AMOUNT</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="transaction-name">
                          <span
                            className={`transaction-symbol ${
                              item.type === 'income'
                                ? 'symbol-income'
                                : 'symbol-expense'
                            }`}
                          >
                            {item.type === 'income' ? '↓' : '↑'}
                          </span>
                          <span>{item.title}</span>
                        </div>
                      </td>
                      <td>
                        <span className="category-tag">
                          {item.category}
                        </span>
                      </td>
                      <td className="date-cell">
                        {new Date(
                          `${item.date}T00:00:00`,
                        ).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td>
                        <strong
                          className={
                            item.type === 'income'
                              ? 'amount-income'
                              : 'amount-expense'
                          }
                        >
                          {item.type === 'income' ? '+' : '−'}
                          {money(item.amount)}
                        </strong>
                      </td>
                      <td>
                        <button
                          className="delete-button"
                          type="button"
                          onClick={() =>
                            deleteTransaction(item.id)
                          }
                          aria-label={`Delete ${item.title}`}
                          title="Delete transaction"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="empty-table">
                      No transactions match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            <span>
              Showing {filteredTransactions.length} transaction
              {filteredTransactions.length === 1 ? '' : 's'}
            </span>
            <button
              className="text-button"
              type="button"
              onClick={resetDemo}
            >
              Reset demo data
            </button>
          </div>
        </section>

        <footer className="page-footer">
          <span>PENNYWISE · PERSONAL FINANCE</span>
          <span>Small steps. Clearer finances.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;