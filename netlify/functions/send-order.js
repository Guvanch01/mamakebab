// Serverless-функция Netlify: получает заказ с сайта и пересылает его
// в Telegram-бот. Токен и chat_id берутся из переменных окружения Netlify
// (Site settings → Environment variables), они НЕ хранятся в коде сайта.

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    return { statusCode: 500, body: "Bot is not configured (env vars missing)" };
  }

  let order;
  try {
    order = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  if (!order.items || order.items.length === 0 || !order.contact) {
    return { statusCode: 400, body: "Incomplete order" };
  }

  const itemsText = order.items
    .map(i => `• ${i.name} × ${i.qty} — ${(i.price * i.qty).toFixed(2)} руб.`)
    .join("\n");

  const text =
    `🆕 НОВЫЙ ЗАКАЗ — Мама Кебаб\n\n` +
    `${itemsText}\n\n` +
    `Итого: ${order.total.toFixed(2)} руб.\n` +
    `Время ожидания: ${order.waitMinutes} мин\n` +
    `Контакт клиента: ${order.contact}\n` +
    (order.comment ? `Комментарий: ${order.comment}\n` : "");

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text })
    });

    const tgData = await tgRes.json();
    if (!tgData.ok) {
      return { statusCode: 502, body: JSON.stringify(tgData) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: "Telegram request failed" };
  }
};
