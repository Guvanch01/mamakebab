// ==========================================================
// Мама Кебаб — логика сайта: меню, корзина, бонусы, заказ
// ==========================================================

const state = {
  activeTab: "boxes",
  cart: JSON.parse(localStorage.getItem("mk_cart") || "[]"),
  waitTime: WAIT_OPTIONS[0]
};

// ---------- Меню: вкладки и карточки ----------
function renderTabs(){
  const tabsEl = document.getElementById("menuTabs");
  tabsEl.innerHTML = "";
  Object.keys(MENU_DATA).forEach(key=>{
    const btn = document.createElement("button");
    btn.className = "menu-tab" + (key===state.activeTab ? " active" : "");
    btn.textContent = MENU_DATA[key].title;
    btn.onclick = () => { state.activeTab = key; renderTabs(); renderMenuContent(); };
    tabsEl.appendChild(btn);
  });
}

function money(n){
  return n.toFixed(2).replace(/\.00$/,"") + " руб.";
}

function renderMenuContent(){
  const wrap = document.getElementById("menuContent");
  const section = MENU_DATA[state.activeTab];
  wrap.innerHTML = "";

  if(section.note){
    const note = document.createElement("p");
    note.className = "menu-note";
    note.textContent = section.note;
    wrap.appendChild(note);
  }

  const grid = document.createElement("div");
  grid.className = "menu-grid";

  section.items.forEach(item=>{
    const card = document.createElement("div");
    card.className = "menu-card";

    const title = document.createElement("h4");
    title.textContent = item.name;
    card.appendChild(title);

    if(item.desc){
      const desc = document.createElement("p");
      desc.textContent = item.desc;
      card.appendChild(desc);
    }

    if(item.sizes){
      const row = document.createElement("div");
      row.className = "size-row";
      Object.entries(item.sizes).forEach(([size, price])=>{
        const b = document.createElement("button");
        b.className = "size-btn";
        b.textContent = `${size} — ${money(price)}`;
        b.onclick = () => addToCart({
          key: item.id + "_" + size,
          name: `${item.name} (${size})`,
          price
        });
        row.appendChild(b);
      });
      card.appendChild(row);
    } else {
      const footer = document.createElement("div");
      footer.className = "menu-card-footer";
      const price = document.createElement("span");
      price.className = "price-tag";
      price.textContent = money(item.price);
      const addBtn = document.createElement("button");
      addBtn.className = "add-btn";
      addBtn.textContent = "+";
      addBtn.onclick = () => addToCart({ key:item.id, name:item.name, price:item.price });
      footer.appendChild(price);
      footer.appendChild(addBtn);
      card.appendChild(footer);
    }

    grid.appendChild(card);
  });

  wrap.appendChild(grid);
}

// ---------- Корзина ----------
function saveCart(){
  localStorage.setItem("mk_cart", JSON.stringify(state.cart));
  renderCart();
}

function addToCart({key, name, price}){
  const existing = state.cart.find(i=>i.key===key);
  if(existing){ existing.qty += 1; }
  else { state.cart.push({key, name, price, qty:1}); }
  saveCart();
  openCart();
}

function changeQty(key, delta){
  const item = state.cart.find(i=>i.key===key);
  if(!item) return;
  item.qty += delta;
  if(item.qty <= 0){
    state.cart = state.cart.filter(i=>i.key!==key);
  }
  saveCart();
}

function cartTotal(){
  return state.cart.reduce((sum,i)=> sum + i.price*i.qty, 0);
}

function renderCart(){
  const itemsEl = document.getElementById("cartItems");
  const emptyEl = document.getElementById("cartEmpty");
  const formEl = document.getElementById("cartOrderForm");
  const countEl = document.getElementById("cartCount");
  const totalEl = document.getElementById("cartTotal");

  countEl.textContent = state.cart.reduce((s,i)=>s+i.qty,0);
  itemsEl.innerHTML = "";

  if(state.cart.length === 0){
    emptyEl.style.display = "block";
    formEl.style.display = "none";
    return;
  }
  emptyEl.style.display = "none";
  formEl.style.display = "block";

  state.cart.forEach(item=>{
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <div>
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-meta">${money(item.price)} × ${item.qty}</div>
      </div>
      <div class="qty-controls">
        <button data-action="minus">−</button>
        <span>${item.qty}</span>
        <button data-action="plus">+</button>
      </div>
    `;
    row.querySelector('[data-action="minus"]').onclick = () => changeQty(item.key, -1);
    row.querySelector('[data-action="plus"]').onclick = () => changeQty(item.key, 1);
    itemsEl.appendChild(row);
  });

  totalEl.textContent = money(cartTotal());
}

function openCart(){
  document.getElementById("cartDrawer").classList.add("open");
  document.getElementById("cartOverlay").classList.add("open");
}
function closeCart(){
  document.getElementById("cartDrawer").classList.remove("open");
  document.getElementById("cartOverlay").classList.remove("open");
}

// ---------- Время ожидания ----------
function renderWaitOptions(){
  const wrap = document.getElementById("waitOptions");
  wrap.innerHTML = "";
  WAIT_OPTIONS.forEach(min=>{
    const btn = document.createElement("button");
    btn.className = "wait-btn" + (min===state.waitTime ? " active" : "");
    btn.type = "button";
    btn.textContent = min < 60 ? `${min} мин` : "1 час";
    btn.onclick = () => {
      state.waitTime = min;
      document.querySelectorAll(".wait-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
    };
    wrap.appendChild(btn);
  });
}

// ---------- Бонусные баллы (хранятся локально в браузере) ----------
// ВНИМАНИЕ: это простой демонстрационный учёт на стороне браузера (localStorage).
// Он не связывает баллы между разными устройствами. Для полноценной единой
// базы клиентов в будущем стоит подключить бэкенд/базу данных.
function normalizeContact(raw){
  return raw.trim().toLowerCase();
}

function getBonusMap(){
  return JSON.parse(localStorage.getItem("mk_bonus") || "{}");
}

function addBonusPoints(contact, orderTotal){
  const map = getBonusMap();
  const key = normalizeContact(contact);
  const earned = Math.floor(orderTotal / BONUS_RULES.stepAmount) * BONUS_RULES.pointsPerStep;
  map[key] = (map[key] || 0) + earned;
  localStorage.setItem("mk_bonus", JSON.stringify(map));
  return { earned, total: map[key] };
}

function lookupBonus(contact){
  const map = getBonusMap();
  return map[normalizeContact(contact)] || 0;
}

// ---------- Отправка заказа ----------
async function submitOrder(){
  const errorEl = document.getElementById("formError");
  const statusEl = document.getElementById("orderStatus");
  const contact = document.getElementById("contactInput").value.trim();
  const comment = document.getElementById("commentInput").value.trim();
  errorEl.textContent = "";
  statusEl.textContent = "";

  if(state.cart.length === 0){
    errorEl.textContent = "Корзина пуста.";
    return;
  }
  if(!contact){
    errorEl.textContent = "Укажите телефон или Telegram-username — это обязательно.";
    return;
  }

  const total = cartTotal();
  const payload = {
    items: state.cart,
    total,
    waitMinutes: state.waitTime,
    contact,
    comment
  };

  const btn = document.getElementById("submitOrderBtn");
  btn.disabled = true;
  btn.textContent = "Отправляем...";

  try{
    const res = await fetch("/.netlify/functions/send-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error("Ошибка отправки");

    const bonus = addBonusPoints(contact, total);
    statusEl.textContent = `Заказ отправлен! Начислено ${bonus.earned} баллов (всего: ${bonus.total}).`;
    state.cart = [];
    saveCart();
    document.getElementById("contactInput").value = "";
    document.getElementById("commentInput").value = "";
  } catch(err){
    errorEl.textContent = "Не удалось отправить заказ. Попробуйте ещё раз или позвоните нам.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Оформить заказ";
  }
}

// ---------- Инициализация ----------
document.addEventListener("DOMContentLoaded", () => {
  renderTabs();
  renderMenuContent();
  renderCart();
  renderWaitOptions();

  document.getElementById("cartBtn").onclick = openCart;
  document.getElementById("cartClose").onclick = closeCart;
  document.getElementById("cartOverlay").onclick = closeCart;
  document.getElementById("submitOrderBtn").onclick = submitOrder;

  document.getElementById("burgerBtn").onclick = () => {
    document.getElementById("mainNav").classList.toggle("open");
  };

  document.getElementById("bonusLookupBtn").onclick = () => {
    const val = document.getElementById("bonusLookupInput").value.trim();
    const resultEl = document.getElementById("bonusLookupResult");
    if(!val){ resultEl.textContent = "Введите телефон или username."; return; }
    const points = lookupBonus(val);
    resultEl.textContent = `Баланс: ${points} баллов` +
      (points >= BONUS_RULES.redeemThreshold ? " — доступна 1 бесплатная шаурма! 🎉" : "");
  };
});