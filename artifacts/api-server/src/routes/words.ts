import { Router } from "express";
import { getWords, getLanguages } from "../data/words";
import { GetWordsParams } from "@workspace/api-zod";

const router = Router();

// GET /words/languages — must come before /words/:language/:category
router.get("/words/languages", (req, res) => {
  res.json(getLanguages());
});

// GET /words/:language/:category
router.get("/words/:language/:category", (req, res) => {
  const parsed = GetWordsParams.safeParse({
    language: req.params.language,
    category: req.params.category,
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid parameters" });
    return;
  }

  const words = getWords(parsed.data.language, parsed.data.category);
  if (!words) {
    res.status(404).json({ error: "Language or category not found" });
    return;
  }

  res.json(words);
});

export default router;
