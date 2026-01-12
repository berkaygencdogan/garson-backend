const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * 🔔 PUSH GÖNDER
 */
exports.sendPushToTokens = async (tokens, message) => {
  if (!tokens || !tokens.length) return;

  const notifications = tokens.map((token) => ({
    to: token,
    sound: "default",
    title: message.title,
    body: message.body,
    data: message.data || {},
  }));

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(notifications),
  });

  const json = await res.json();

  if (json.errors) {
    console.error("❌ PUSH ERROR:", json.errors);
  } else {
    console.log("✅ PUSH SENT:", json.data?.length);
  }
};
