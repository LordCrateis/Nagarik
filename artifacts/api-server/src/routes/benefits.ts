import { Router, type IRouter } from "express";
import {
  AnalyzeBenefitsBody,
  AnalyzeBenefitsResponse,
  DetectConflictsBody,
  DetectConflictsResponse,
  EvaluateEligibilityBody,
  EvaluateEligibilityResponse,
  GetChecklistParams,
  GetChecklistResponse,
  GetSchemeParams,
  GetSchemeResponse,
  ListDemoProfilesResponse,
  ListSchemesResponse,
  OptimizeBundleBody,
  OptimizeBundleResponse,
  SaveCitizenProfileBody,
  SaveCitizenProfileResponse,
} from "@workspace/api-zod";
import { analyzeProfile, checklistFor, detectConflicts, evaluateEligibility, optimizeBundle, saveProfile } from "../lib/benefit-engine";
import { publicSchemeById, schemeDetailsById, schemes } from "../lib/schemes";

const router: IRouter = Router();

const demoProfiles = [
  {
    id: "student",
    label: "Student / low income",
    description: "A 22-year-old student balancing education costs and a first job search.",
    name: "Aarav Menon",
    age: 22,
    gender: "man",
    state: "Karnataka",
    district: "Mysuru",
    occupation: "Student",
    annualIncome: 180000,
    familySize: 4,
    category: "OBC",
    disabilityStatus: false,
    studentStatus: true,
    employmentStatus: "unemployed",
    farmerStatus: false,
    housingStatus: "rented",
    maritalStatus: "single",
    landSize: null,
    urgency: "high",
    availableDocuments: ["Aadhaar", "Income Certificate", "Student ID", "Family ID"],
  },
  {
    id: "farmer",
    label: "Farmer / middle income",
    description: "A small farmer looking for seasonal input and water-saving support.",
    name: "Meera Patil",
    age: 41,
    gender: "woman",
    state: "Maharashtra",
    district: "Nashik",
    occupation: "Small Farmer",
    annualIncome: 320000,
    familySize: 5,
    category: "General",
    disabilityStatus: false,
    studentStatus: false,
    employmentStatus: "self-employed",
    farmerStatus: true,
    housingStatus: "owned",
    maritalStatus: "married",
    landSize: 3.5,
    urgency: "medium",
    availableDocuments: ["Aadhaar", "Land Record", "Bank Passbook", "Family ID"],
  },
  {
    id: "senior",
    label: "Senior citizen / low income",
    description: "A senior citizen prioritizing stable income, healthcare, and food security.",
    name: "Ramesh Iyer",
    age: 67,
    gender: "man",
    state: "Tamil Nadu",
    district: "Coimbatore",
    occupation: "Retired",
    annualIncome: 140000,
    familySize: 3,
    category: "General",
    disabilityStatus: false,
    studentStatus: false,
    employmentStatus: "unemployed",
    farmerStatus: false,
    housingStatus: "owned",
    maritalStatus: "married",
    landSize: null,
    urgency: "high",
    availableDocuments: ["Aadhaar", "Age Proof", "Income Certificate", "Bank Passbook"],
  },
];

router.get("/schemes", (_req, res) => {
  res.json(ListSchemesResponse.parse(schemes));
});

router.get("/schemes/:id/details", (req, res) => {
  const detail = schemeDetailsById.get(req.params.id);
  if (!detail) {
    res.status(404).json({ error: "Scheme not found" });
    return;
  }
  res.json(detail);
});

router.get("/schemes/:id", (req, res) => {
  const params = GetSchemeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const scheme = publicSchemeById.get(params.data.id);
  if (!scheme) {
    res.status(404).json({ error: "Scheme not found" });
    return;
  }
  res.json(GetSchemeResponse.parse(scheme));
});

router.get("/demo-profiles", (_req, res) => {
  res.json(ListDemoProfilesResponse.parse(demoProfiles));
});

router.post("/citizen/profile", (req, res) => {
  const parsed = SaveCitizenProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(SaveCitizenProfileResponse.parse(saveProfile(parsed.data)));
});

router.post("/analyze", async (req, res) => {
  const parsed = AnalyzeBenefitsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    res.json(AnalyzeBenefitsResponse.parse(await analyzeProfile(parsed.data)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Benefit analysis failed.";
    const unavailable = /(?:429|503|rate limit|too large|unavailable|Gemini)/i.test(message);
    res.status(unavailable ? 503 : 502).json({
      error: unavailable
        ? "Analysis is temporarily busy. Your details are still here — wait a moment and try again."
        : "We could not complete the analysis. Please try again.",
    });
  }
});

router.post("/eligibility", (req, res) => {
  const parsed = EvaluateEligibilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(EvaluateEligibilityResponse.parse(evaluateEligibility(parsed.data)));
});

router.post("/conflicts", (req, res) => {
  const parsed = DetectConflictsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(DetectConflictsResponse.parse(detectConflicts(parsed.data.eligibleSchemeIds)));
});

router.post("/optimize", (req, res) => {
  const parsed = OptimizeBundleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(OptimizeBundleResponse.parse(optimizeBundle(parsed.data.profile, parsed.data.eligibleSchemeIds, parsed.data.conflicts)));
});

router.get("/checklist/:citizenId", (req, res) => {
  const params = GetChecklistParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const checklist = checklistFor(params.data.citizenId);
  if (!checklist) {
    res.status(404).json({ error: "Checklist not found. Run an analysis first." });
    return;
  }
  res.json(GetChecklistResponse.parse(checklist));
});

export default router;
