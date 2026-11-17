import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, session, store, money } from './api.js';

/* ---------- tiny hash router ---------- */
function useRoute() {
  const read = () => {
    const parts = (window.location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
    return { name: parts[0] || 'shop', id: parts[1] };
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
const go = (path) => { window.location.hash = `#/${path}`; };

const CATEGORIES = [
  { name: 'All', icon: '✨' },
  { name: 'Tech', icon: '🎧' },
  { name: 'Home', icon: '🏡' },
  { name: 'Style', icon: '👟' },
  { name: 'Fitness', icon: '🏋️' },
];

const Tile = ({ p, size = 'md' }) => (
  <div className={`tile ${size}`} style={{ '--tint': p.color || '#7c5cff' }}>
    <span>{p.image}</span>
  </div>
);

/* ---------- shop ---------- */
function Shop({ onAdd }) {
  const [category, setCategory] = useState('All');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('featured');
  const [list, setList] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    setState('loading');
    const t = setTimeout(() => {
      api
        .products({ category: category === 'All' ? '' : category, q })
        .then((d) => { setList(d.products); setState('ready'); })
        .catch((e) => { setError(e.message); setState('error'); });
    }, 180);
    return () => clearTimeout(t);
  }, [category, q]);

  const sorted = useMemo(() => {
    const l = [...list];
    if (sort === 'low') l.sort((a, b) => a.price - b.price);
    if (sort === 'high') l.sort((a, b) => b.price - a.price);
    if (sort === 'az') l.sort((a, b) => a.name.localeCompare(b.name));
    return l;
  }, [list, sort]);

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Fresh drops · Free delivery over ₹1,999</p>
          <h1>Find things you'll <em>actually</em> love.</h1>
          <p className="sub">Tech, home, style and fitness picks, handled by three tiny microservices.</p>
        </div>
        <label className="searchbox">
          <span aria-hidden>🔍</span>
          <input placeholder="Search earbuds, candles, yoga…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </section>

      <div className="chips" role="tablist">
        {CATEGORIES.map((c) => (
          <button key={c.name} className={`chip ${category === c.name ? 'on' : ''}`} onClick={() => setCategory(c.name)}>
            <span aria-hidden>{c.icon}</span> {c.name}
          </button>
        ))}
        <select className="sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
          <option value="featured">Featured</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
          <option value="az">Name: A to Z</option>
        </select>
      </div>

      {state === 'error' && <div className="banner error">Couldn't load products: {error}</div>}
      {state === 'loading' && !list.length && (
        <div className="grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" />)}</div>
      )}
      <div className="grid">
        {sorted.map((p) => (
          <article key={p.id} className="pcard">
            <a href={`#/product/${p.id}`} className="pcard-link" aria-label={`View ${p.name}`}>
              <Tile p={p} />
            </a>
            <div className="pcard-body">
              <span className="cat">{p.category}</span>
              <a href={`#/product/${p.id}`} className="pname">{p.name}</a>
              <div className="pfoot">
                <b>{money(p.price)}</b>
                <button className="add" onClick={() => onAdd(p)} aria-label={`Add ${p.name} to cart`}>＋</button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {state === 'ready' && !sorted.length && <p className="empty">Nothing matches "{q}". Try another search.</p>}
    </>
  );
}

/* ---------- product detail ---------- */
function Product({ id, onAdd }) {
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  useEffect(() => {
    setP(null);
    api.product(id).then((d) => setP(d.product)).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="banner error">{error} <a href="#/">Back to shop</a></div>;
  if (!p) return <div className="skeleton tall" />;
  return (
    <div className="pdetail">
      <a className="back" href="#/">← All products</a>
      <div className="pdetail-grid">
        <Tile p={p} size="xl" />
        <div className="pinfo">
          <span className="cat">{p.category}</span>
          <h1>{p.name}</h1>
          <p className="price">{money(p.price)}</p>
          <p className="desc">{p.description}</p>
          <p className={`stock ${p.stock > 0 ? 'in' : 'out'}`}>{p.stock > 0 ? `● ${p.stock} in stock` : '● Out of stock'}</p>
          <div className="buyrow">
            <div className="stepper">
              <button onClick={() => setQty((n) => Math.max(1, n - 1))} aria-label="Decrease">−</button>
              <span>{qty}</span>
              <button onClick={() => setQty((n) => Math.min(20, n + 1))} aria-label="Increase">＋</button>
            </div>
            <button className="primary" disabled={p.stock < 1} onClick={() => onAdd(p, qty)}>Add to cart · {money(p.price * qty)}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- orders ---------- */
function Orders({ user }) {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user) return;
    api.orders().then((d) => setOrders(d.orders)).catch((e) => setError(e.message));
  }, [user]);

  if (!user) return <Gate />;
  if (error) return <div className="banner error">{error}</div>;
  if (!orders) return <div className="skeleton tall" />;
  return (
    <>
      <h1 className="pagetitle">Your orders</h1>
      {!orders.length && <p className="empty">No orders yet. <a href="#/">Start shopping →</a></p>}
      <div className="orders">
        {orders.map((o) => (
          <article key={o.id} className="order">
            <header>
              <div>
                <span className="oid">#{o.id.slice(0, 8).toUpperCase()}</span>
                <span className="odate">{new Date(o.createdAt).toLocaleString()}</span>
              </div>
              <span className="status">{o.status}</span>
            </header>
            <ul>
              {o.items.map((i) => (
                <li key={i.productId}>
                  <span className="mini" style={{ '--tint': i.color || '#7c5cff' }}>{i.image}</span>
                  <span className="grow">{i.name} <small>× {i.quantity}</small></span>
                  <b>{money(i.price * i.quantity)}</b>
                </li>
              ))}
            </ul>
            <footer>Total <b>{money(o.total)}</b></footer>
          </article>
        ))}
      </div>
    </>
  );
}

const Gate = () => (
  <div className="empty">Please <a href="#/login">log in</a> to see this page.</div>
);

/* ---------- auth ---------- */
function Auth({ mode, onDone }) {
  const isReg = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { onDone(isReg ? await api.register(form) : await api.login(form)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth">
      <div className="auth-art">
        <div className="blob b1" /><div className="blob b2" />
        <h2>{isReg ? 'Join the bazaar.' : 'Good to see you again.'}</h2>
        <p>{isReg ? 'Create a free account to save your cart and track every order.' : 'Log in to check out and see your order history.'}</p>
      </div>
      <form onSubmit={submit} className="auth-form">
        <h1>{isReg ? 'Create account' : 'Log in'}</h1>
        {error && <div className="banner error">{error}</div>}
        {isReg && <label>Full name<input value={form.name} onChange={set('name')} autoComplete="name" required /></label>}
        <label>Email<input type="email" value={form.email} onChange={set('email')} autoComplete="email" required /></label>
        <label>Password<input type="password" minLength={6} value={form.password} onChange={set('password')} autoComplete={isReg ? 'new-password' : 'current-password'} required /></label>
        <button className="primary" disabled={busy}>{busy ? 'One moment…' : isReg ? 'Create account' : 'Log in'}</button>
        <p className="switch">
          {isReg ? 'Already registered?' : 'New here?'} <a href={isReg ? '#/login' : '#/register'}>{isReg ? 'Log in' : 'Create an account'}</a>
        </p>
      </form>
    </div>
  );
}

/* ---------- cart drawer ---------- */
function CartDrawer({ open, onClose, cart, setCart, user, onCheckout, busy }) {
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const setQty = (id, d) => setCart((c) => c.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, Math.min(20, i.quantity + d)) } : i)));
  const remove = (id) => setCart((c) => c.filter((i) => i.id !== id));
  return (
    <>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
        <header><h2>Your cart</h2><button className="x" onClick={onClose} aria-label="Close cart">✕</button></header>
        {!cart.length ? (
          <div className="drawer-empty"><span>🧺</span><p>Your cart is empty.</p><button className="ghost" onClick={() => { onClose(); go(''); }}>Browse products</button></div>
        ) : (
          <>
            <ul className="lines">
              {cart.map((i) => (
                <li key={i.id}>
                  <span className="mini lg" style={{ '--tint': i.color || '#7c5cff' }}>{i.image}</span>
                  <div className="grow">
                    <b>{i.name}</b>
                    <small>{money(i.price)}</small>
                    <div className="stepper sm">
                      <button onClick={() => setQty(i.id, -1)} aria-label="Decrease">−</button>
                      <span>{i.quantity}</span>
                      <button onClick={() => setQty(i.id, 1)} aria-label="Increase">＋</button>
                    </div>
                  </div>
                  <div className="right"><b>{money(i.price * i.quantity)}</b><button className="rm" onClick={() => remove(i.id)}>Remove</button></div>
                </li>
              ))}
            </ul>
            <footer>
              <div className="sum"><span>Subtotal</span><b>{money(total)}</b></div>
              <button className="primary wide" disabled={busy} onClick={onCheckout}>{user ? (busy ? 'Placing order…' : 'Place order') : 'Log in to checkout'}</button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}

/* ---------- app shell ---------- */
export default function App() {
  const route = useRoute();
  const [user, setUser] = useState(session.user);
  const [cart, setCart] = useState(() => { try { return JSON.parse(store.get('bazaarly_cart')) || []; } catch { return []; } });
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => store.set('bazaarly_cart', JSON.stringify(cart)), [cart]);
  const flash = useCallback((type, text) => { setToast({ type, text, k: Date.now() }); }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t); }, [toast]);

  const count = cart.reduce((s, i) => s + i.quantity, 0);
  const add = (p, qty = 1) => {
    setCart((c) => {
      const ex = c.find((i) => i.id === p.id);
      if (ex) return c.map((i) => (i.id === p.id ? { ...i, quantity: Math.min(20, i.quantity + qty) } : i));
      return [...c, { id: p.id, name: p.name, price: p.price, image: p.image, color: p.color, quantity: qty }];
    });
    flash('ok', `${p.name} added to cart`);
  };

  const logout = () => { session.clear(); setUser(null); go(''); flash('ok', 'Logged out'); };
  const onAuth = ({ token, user: u }) => {
    session.save(token, u); setUser(u);
    flash('ok', `Welcome, ${u.name.split(' ')[0]}!`);
    if (cart.length) { go(''); setDrawer(true); } else go('');
  };

  const checkout = async () => {
    if (!user) { setDrawer(false); go('login'); return; }
    setBusy(true);
    try {
      await api.placeOrder(cart.map((i) => ({ productId: i.id, quantity: i.quantity })));
      setCart([]); setDrawer(false); go('orders'); flash('ok', 'Order placed. Thank you!');
    } catch (err) {
      if (err.status === 401) { session.clear(); setUser(null); setDrawer(false); go('login'); flash('err', 'Session expired, please log in again'); }
      else flash('err', err.message);
    } finally { setBusy(false); }
  };

  let page;
  if (route.name === 'product') page = <Product id={route.id} onAdd={add} />;
  else if (route.name === 'orders') page = <Orders user={user} />;
  else if (route.name === 'login') page = <Auth mode="login" onDone={onAuth} />;
  else if (route.name === 'register') page = <Auth mode="register" onDone={onAuth} />;
  else page = <Shop onAdd={add} />;

  const active = (n) => (route.name === n ? 'active' : '');
  return (
    <div className="shell">
      <aside className="side">
        <a href="#/" className="logo"><span>🧺</span> Bazaarly</a>
        <nav>
          <a href="#/" className={route.name === 'shop' || route.name === 'product' ? 'active' : ''}>🛍️ <em>Shop</em></a>
          <a href="#/orders" className={active('orders')}>📦 <em>Orders</em></a>
          <button onClick={() => setDrawer(true)}>🧺 <em>Cart</em>{count > 0 && <i className="count">{count}</i>}</button>
        </nav>
        <div className="who">
          {user ? (
            <>
              <div className="avatar">{user.name[0].toUpperCase()}</div>
              <div className="grow"><b>{user.name}</b><small>{user.email}</small></div>
              <button className="ghost sm" onClick={logout}>Log out</button>
            </>
          ) : (
            <><a className="ghost sm" href="#/login">Log in</a><a className="primary sm" href="#/register">Sign up</a></>
          )}
        </div>
      </aside>
      <main className="content">{page}</main>
      <CartDrawer open={drawer} onClose={() => setDrawer(false)} cart={cart} setCart={setCart} user={user} onCheckout={checkout} busy={busy} />
      {toast && <div key={toast.k} className={`toast ${toast.type}`} role="status">{toast.text}</div>}
    </div>
  );
}
