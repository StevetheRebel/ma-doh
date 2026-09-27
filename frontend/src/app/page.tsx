import {
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  MessageSquareText,
  Mic,
  Plus,
  ReceiptText,
  Sparkles,
  WalletCards,
} from "lucide-react";

const captureMethods = [
  { label: "Scan receipt", icon: Camera, tone: "green" },
  { label: "Record voice", icon: Mic, tone: "blue" },
  { label: "Paste message", icon: MessageSquareText, tone: "amber" },
  { label: "Enter manually", icon: Plus, tone: "neutral" },
] as const;

const recentTransactions = [
  {
    merchant: "Naivas Supermarket",
    category: "Groceries",
    amount: "- KES 2,450",
    time: "Today, 10:42",
    icon: ReceiptText,
    positive: false,
  },
  {
    merchant: "Salary",
    category: "Income",
    amount: "+ KES 85,000",
    time: "26 Sep, 08:15",
    icon: ArrowDownLeft,
    positive: true,
  },
  {
    merchant: "Little Cab",
    category: "Transport",
    amount: "- KES 680",
    time: "25 Sep, 18:30",
    icon: ArrowUpRight,
    positive: false,
  },
] as const;

export default function Home() {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-mark" aria-label="Ma-Doh home">
          <span>Ma</span>
          <strong>Doh</strong>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-button nav-button-active" type="button">
            <LayoutDashboard size={19} />
            <span>Overview</span>
          </button>
          <button className="nav-button" type="button">
            <ReceiptText size={19} />
            <span>Transactions</span>
          </button>
          <button className="nav-button" type="button">
            <Sparkles size={19} />
            <span>Ask My Money</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <span className="avatar" aria-hidden="true">SK</span>
          <div>
            <strong>Steve</strong>
            <span>Demo account</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Sunday, 27 September</p>
            <h1>Good morning, Steve</h1>
          </div>
          <button className="primary-button" type="button">
            <Plus size={18} />
            Add transaction
          </button>
        </header>

        <section className="summary-grid" aria-label="Financial summary">
          <article className="summary-card summary-balance">
            <div className="summary-label">
              <WalletCards size={18} />
              Available balance
            </div>
            <strong>KES 63,540</strong>
            <span>Across confirmed records</span>
          </article>
          <article className="summary-card">
            <div className="summary-label income-label">
              <ArrowDownLeft size={18} />
              Income
            </div>
            <strong>KES 85,000</strong>
            <span>This month</span>
          </article>
          <article className="summary-card">
            <div className="summary-label expense-label">
              <ArrowUpRight size={18} />
              Expenses
            </div>
            <strong>KES 21,460</strong>
            <span>This month</span>
          </article>
        </section>

        <section className="workspace-grid">
          <div className="workspace-main">
            <section className="section-block">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Quick capture</p>
                  <h2>Add money activity</h2>
                </div>
              </div>
              <div className="capture-grid">
                {captureMethods.map(({ label, icon: Icon, tone }) => (
                  <button className={`capture-button capture-${tone}`} key={label} type="button">
                    <span className="capture-icon"><Icon size={22} /></span>
                    <span>{label}</span>
                    <ChevronRight size={17} />
                  </button>
                ))}
              </div>
            </section>

            <section className="section-block">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Latest activity</p>
                  <h2>Recent transactions</h2>
                </div>
                <button className="text-button" type="button">View all</button>
              </div>

              <div className="transaction-list">
                {recentTransactions.map(({ merchant, category, amount, time, icon: Icon, positive }) => (
                  <article className="transaction-row" key={`${merchant}-${time}`}>
                    <span className="transaction-icon"><Icon size={19} /></span>
                    <div className="transaction-details">
                      <strong>{merchant}</strong>
                      <span>{category} · {time}</span>
                    </div>
                    <strong className={positive ? "amount-positive" : "amount-negative"}>{amount}</strong>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="insight-panel">
            <div className="insight-icon"><Sparkles size={21} /></div>
            <p className="eyebrow">Ask My Money</p>
            <h2>Where is most of my money going?</h2>
            <div className="insight-answer">
              <span>Largest category</span>
              <strong>Groceries</strong>
              <p>KES 8,420 across 6 confirmed transactions.</p>
            </div>
            <button className="secondary-button" type="button">
              <CircleDollarSign size={18} />
              Ask another question
            </button>
          </aside>
        </section>
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button className="mobile-nav-active" type="button" aria-label="Overview">
          <LayoutDashboard size={21} />
          <span>Overview</span>
        </button>
        <button type="button" aria-label="Add transaction">
          <span className="mobile-add"><Plus size={23} /></span>
          <span>Add</span>
        </button>
        <button type="button" aria-label="Ask My Money">
          <Sparkles size={21} />
          <span>Ask</span>
        </button>
      </nav>
    </div>
  );
}
