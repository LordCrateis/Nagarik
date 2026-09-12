import { Router, type IRouter } from "express";
import { answerChat } from "../lib/chat";

const router: IRouter = Router();

router.post("/chat", async (req, res) => {
  const query = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const language = typeof req.body?.language === "string" ? req.body.language : "en";
  if (!query) {
    res.status(400).json({ error: "Message is required." });
    return;
  }
  if (query.length > 1600) {
    res.status(413).json({ error: "Please keep your question under 1600 characters." });
    return;
  }
  try {
    res.json(await answerChat(query, history, language));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat service is unavailable.";
    res.status(/missing|unavailable|failed \(429\)|failed \(503\)/i.test(message) ? 503 : 502).json({ error: message });
  }
});

export default router;