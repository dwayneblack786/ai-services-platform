/**
 * seed-rag-medical.ts
 *
 * Phase 5 — Seed RAG knowledge-base content for the 10 medical prompt templates.
 *
 * For each tenant_prompt_version belonging to tenant-default + the medical product:
 *   1. Adds a RAG source entry to content.ragConfig.sources (if not already present)
 *   2. Creates a rag_document record with chunked policy/FAQ text for that prompt
 *
 * This gives the chat/voice assistants factual context to retrieve at inference time
 * without requiring an embedding service (keyword retrieval works out of the box).
 *
 * Run: npx ts-node src/scripts/seed-rag-medical.ts
 *
 * Idempotent: re-running clears existing rag_documents for this tenant+product and
 * re-inserts them fresh.
 */

import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose, { Types } from 'mongoose';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PRODUCT_ID = new Types.ObjectId('69728bdb0959e1a2da517684');
const TENANT_ID = 'tenant-default';

// ---------------------------------------------------------------------------
// Knowledge base: one article per prompt (keyed by prompt name substring)
// ---------------------------------------------------------------------------

interface KbArticle {
  /** Matched against the tenant prompt `name` field (case-insensitive includes) */
  nameMatch: string;
  sourceName: string;
  text: string;
}

const KB_ARTICLES: KbArticle[] = [
  // ── Voice prompts ────────────────────────────────────────────────────────

  {
    nameMatch: 'appointment scheduling',
    sourceName: 'Appointment Scheduling Policy',
    text: `
APPOINTMENT SCHEDULING POLICIES AND PROCEDURES

Scheduling New Appointments:
- Collect full name, date of birth, insurance member ID, reason for visit, and preferred provider.
- For new patients: also collect home address, phone number, emergency contact, and primary insurance details.
- Offer at least three date/time options when a specific slot is requested.
- Telehealth appointments are available for established patients for routine follow-ups and medication management.

Rescheduling:
- Verify patient identity (name + DOB) before making changes.
- Reschedules are available up to 24 hours before the appointment without fee.
- Rescheduling within 24 hours of the appointment is treated as a late cancellation.

Cancellations:
- 24-hour advance notice required to avoid a $25 late-cancellation fee.
- Emergency cancellations (ER visit, hospitalization) are exempt — collect documentation.
- Three no-shows in 12 months may result in dismissal from the practice per policy.

Provider Preferences:
- Honor provider preferences when slots are available.
- If preferred provider is unavailable within 14 days, offer next available with a note to the preferred provider's scheduler.

Urgent / Same-Day Appointments:
- Same-day urgent slots are held until 10 AM daily. Release to general scheduling after 10 AM.
- Triage nurses screen requests for same-day slots — use the triage routing script if caller describes acute symptoms.

Telehealth:
- Telehealth is offered via the patient portal video platform.
- Patients need a smartphone, tablet, or computer with camera.
- Send the telehealth link 30 minutes before the scheduled time.
- HIPAA-compliant platform — confirm patient is in a private location before starting.

Frequently Asked Questions:
Q: Can I schedule for someone else?
A: Yes, with the patient's verbal consent documented, or for minors with a parent/guardian.

Q: Do you accept walk-ins?
A: Walk-ins are accepted for urgent care visits only, subject to provider availability. Scheduled appointments take priority.

Q: Can I request a specific provider?
A: Yes. If your preferred provider has no availability within 14 days, we will notify you and offer alternatives.

Q: What happens if I'm late?
A: If you arrive more than 15 minutes late, the appointment may need to be rescheduled. Call ahead if you're running late.
    `.trim()
  },

  {
    nameMatch: 'prescription refill',
    sourceName: 'Prescription Refill Policy',
    text: `
PRESCRIPTION REFILL POLICIES AND PROCEDURES

Standard Refills:
- Processing time: 2–3 business days from submission.
- Collect: patient full name, date of birth, medication name, dosage, pharmacy name, and pharmacy phone number.
- The provider reviews all refill requests before sending to pharmacy.
- Never confirm a refill will be approved — only confirm the request has been submitted.

Controlled Substances:
- Schedule II–V controlled substances (e.g., opioids, benzodiazepines, stimulants) cannot be refilled by phone.
- Patient must schedule an in-person or telehealth visit with the prescribing provider.
- Offer to schedule that appointment during the call.

Early Refill Requests:
- Insurance plans typically allow refills when 75–80% of the previous supply has been used.
- Early refill due to travel: patient must request through patient portal with travel documentation.
- Lost/stolen medications require a police report before an emergency supply is considered.

Pharmacy Transfers:
- Patients may request a pharmacy change at any time for non-controlled substances.
- Controlled substance prescriptions cannot be transferred between pharmacies in most states.

Auto-Refill Programs:
- Ask the patient to check with their pharmacy — many offer automatic refill enrollment.
- The practice does not manage pharmacy auto-refill programs directly.

Frequently Asked Questions:
Q: How do I know when my refill is ready?
A: Your pharmacy will contact you when the prescription is ready. Allow 2–3 business days.

Q: Can I get a 90-day supply?
A: Many insurance plans cover 90-day supplies for maintenance medications. Request a 90-day quantity from your provider.

Q: My prescription expired. What do I do?
A: You need an appointment to renew an expired prescription. We can schedule that for you today.

Q: Can you fax it directly to my pharmacy?
A: Yes. Provide the pharmacy name, address, and fax number and we will route it accordingly.
    `.trim()
  },

  {
    nameMatch: 'insurance verification',
    sourceName: 'Insurance Verification Policy',
    text: `
INSURANCE VERIFICATION POLICIES AND PROCEDURES

Information to Collect:
- Insurance company name and plan name
- Member ID (also called subscriber ID)
- Group number
- Policy holder name and date of birth (if different from patient)
- Effective date and termination date if known
- Secondary insurance details if applicable

Verification Timeline:
- Non-emergency appointments: insurance must be verified 48 hours before the appointment.
- Emergency or urgent care: verification is completed retroactively.
- Results communicated to patient within 24 hours of verification completion.

Coverage Outcomes:
- In-network: Patient responsible for copay/deductible per their plan.
- Out-of-network: Higher cost sharing applies; patient will be notified before the visit.
- No coverage found: Billing team contacts patient to discuss self-pay and financial assistance options.

Self-Pay Options:
- Sliding scale fees available for qualifying patients (based on household income).
- Payment plans available for balances over $100.
- Apply for financial assistance through the billing department.

Frequently Asked Questions:
Q: What if my insurance changed recently?
A: Provide the new insurance details. Bring your new insurance card to your appointment.

Q: I don't have insurance. What are my options?
A: Self-pay discounts and sliding scale fees are available. Our billing team will contact you with a cost estimate.

Q: Will you call me with the verification results?
A: Yes. Expect a call or portal message within 24 hours of submitting your insurance information.

Q: What is a deductible?
A: A deductible is the amount you pay out-of-pocket before insurance starts covering costs. We can help explain your specific benefits.
    `.trim()
  },

  {
    nameMatch: 'lab results',
    sourceName: 'Lab Results Notification Policy',
    text: `
LAB RESULTS NOTIFICATION POLICIES AND PROCEDURES

Result Release Timeline:
- Standard lab results: available in patient portal within 24–48 hours of processing.
- Pathology and complex tests: 3–7 business days.
- Critical values: called directly by nursing staff within 1 hour of receipt.

Identity Verification (Required Before Any Disclosure):
- Confirm full name AND date of birth before discussing any result availability.
- Do not leave detailed messages on voicemail — only that the practice called and please call back.

Coordinator Role Boundaries:
- Notify that results are available; guide to patient portal.
- Do NOT interpret, explain, or read lab values aloud.
- Do NOT characterize results as "normal," "abnormal," or "concerning."
- All clinical questions routed to nursing staff.

Routing to Nursing:
- Patient asks about result meaning → Transfer to nurse advice line.
- Patient expresses concern about results → Offer nurse callback or immediate transfer.
- Critical value — patient calls in → Transfer to clinical staff immediately.

Patient Portal Access:
- Available at the web address on discharge paperwork.
- Forgot password: send reset link to email on file.
- Technical issues: refer to portal support line.

Frequently Asked Questions:
Q: Are my results normal?
A: I'm not able to interpret results. I'll connect you with our nursing staff who can go over them with you.

Q: Why aren't my results showing yet?
A: Some tests, especially pathology or specialty labs, take 3–7 business days. If it's been longer, I can check on the status.

Q: Can you email me my results?
A: Results are available securely through the patient portal. I cannot email results due to privacy regulations.

Q: My provider hasn't called about my results. Should I be worried?
A: If your results are available in the portal, your provider has reviewed them. Critical values are always called immediately by our nurses.
    `.trim()
  },

  {
    nameMatch: 'pre-registration',
    sourceName: 'Patient Pre-Registration Policy',
    text: `
PATIENT PRE-REGISTRATION POLICIES AND PROCEDURES

Information Collected During Pre-Registration:
Demographic: Full legal name, date of birth, address, phone, email, preferred language.
Emergency Contact: Name, relationship, phone number.
Insurance: Primary and secondary insurance details (see Insurance Verification policy).
Medical History (new patients): Current medications, known allergies (drug and environmental), previous surgeries, chronic conditions.
Visit Reason: Chief complaint or purpose of upcoming visit.

Data Protection:
- All information collected is governed by HIPAA.
- Do not collect Social Security Number over the phone.
- Obtain verbal consent to record the call before proceeding (in states requiring two-party consent).

Collection Approach:
- Collect one section at a time; confirm accuracy before moving to the next section.
- Spell back names and medication names to confirm.
- If the patient is unsure of a medication name, note description (color, shape, purpose) for the clinical team to clarify.

Allergy Documentation:
- Collect: allergen name, type of reaction, severity (mild/moderate/severe/anaphylaxis).
- "Intolerance" vs. "Allergy": clarify with patient — both should be documented.
- Do not make clinical judgments about allergy severity.

Frequently Asked Questions:
Q: Why do you need my medications list?
A: This helps your care team review potential interactions and prepare for your visit efficiently.

Q: Is my information secure?
A: Yes. All information is protected under HIPAA and stored in our secure electronic health record system.

Q: Can I update this information at the front desk instead?
A: Yes, but pre-registration reduces your check-in wait time significantly.

Q: Do I need to bring my insurance card?
A: Yes, please bring your insurance card to every visit even if we have it on file, in case it's been updated.
    `.trim()
  },

  // ── Chat prompts ─────────────────────────────────────────────────────────

  {
    nameMatch: 'appointment scheduler (chat)',
    sourceName: 'Appointment Scheduling — Chat Reference',
    text: `
CHAT APPOINTMENT SCHEDULING — QUICK REFERENCE

Identity Verification:
Always start by requesting full name and date of birth. Do not proceed without verification.

Appointment Types Available via Chat:
- Primary Care follow-up
- Specialist referrals (after provider order)
- Annual wellness visits
- Telehealth (established patients)
- Urgent care (same-day, subject to availability)

Chat-Specific Guidelines:
- Use numbered lists when presenting date/time options.
- Provide a structured summary at the end: Appointment Type | Provider | Date | Time | Location.
- Send a confirmation message after any booking, reschedule, or cancellation.
- Do not display the patient's full DOB in the chat window — use last 4 digits for confirmation only.

Telehealth Appointments (Chat):
- Confirm patient has working camera and internet connection.
- Send telehealth link via secure portal message 30 minutes before appointment.
- Telehealth is HIPAA-compliant — remind patient to be in a private location.

Cancellation Policy:
- 24-hour advance notice required.
- Chat cancellations are accepted up to 2 hours before the appointment for telehealth.
- In-person cancellations require 24 hours notice to avoid the $25 late-cancellation fee.

Escalation:
- Symptom questions → Do not address clinically. Redirect to Symptom Triage chat or nurse line.
- Billing questions → Transfer to billing chat.
- Urgent medical concern → Advise calling 911 or going to nearest ER.
    `.trim()
  },

  {
    nameMatch: 'medical records request',
    sourceName: 'Medical Records Request Policy',
    text: `
MEDICAL RECORDS REQUEST — RELEASE OF INFORMATION (ROI) POLICY

Information Required to Process a Request:
- Patient full name, date of birth
- Dates of service requested (or "entire chart")
- Type of records: visit notes, lab results, imaging reports, full chart
- Purpose of request: personal use, transfer to new provider, legal, insurance
- Delivery method: patient portal download, secure mail, fax to provider (with fax number)
- Recipient name and address (for third-party releases)

Legal and Compliance Requirements:
- Written authorization required for releases to third parties (attorneys, employers, insurers).
- Verbal authorization accepted for patient's own records (documented in request).
- HIPAA allows up to 30 days to fulfill requests; most complete within 5–7 business days.
- Patients may request amendment to records — route to medical records department.

Fees:
- First 50 pages: no charge.
- Pages 51–200: $0.25 per page.
- Pages 201+: $0.15 per page.
- Electronic records (portal download): no fee.
- Expedited processing (24–48 hours): $25 fee.

Minor Patients:
- Records for minors (under 18) require parent/legal guardian authorization.
- Exception: minors may authorize release of their own records for reproductive health, mental health, or substance use services in states where such laws apply.

Frequently Asked Questions:
Q: How long does it take?
A: Most requests complete within 5–7 business days. HIPAA allows up to 30 days.

Q: Is there a fee?
A: First 50 pages are free. Beyond that, a small per-page fee applies.

Q: Can you fax records to my new doctor?
A: Yes. Provide the receiving provider's name, practice name, and fax number.

Q: Can someone else request my records?
A: Only with your written authorization, or for legal next-of-kin in cases of incapacitation or death.
    `.trim()
  },

  {
    nameMatch: 'billing',
    sourceName: 'Billing & Payment Policy',
    text: `
BILLING & PAYMENT SUPPORT POLICY

Statement Inquiries:
- Verify patient identity (name + date of birth or account number) before discussing account details.
- Explain individual line items on the statement: procedure code, description, charge amount, insurance payment, patient responsibility.
- Clarify EOB (Explanation of Benefits) terminology: allowed amount, contractual adjustment, deductible applied, co-insurance, patient copay.

Payment Options:
- Online: Patient portal billing section (accepts major credit cards, HSA/FSA cards).
- Phone: Call billing department (Monday–Friday 8 AM–5 PM).
- Mail: Check payable to the practice name on the statement.
- In-person: Front desk at any location.

Payment Plans:
- Available for balances over $100.
- Terms: 3, 6, or 12 months, interest-free.
- Auto-pay setup required for plans over 6 months.
- Set up through billing department — cannot be arranged in chat without specialist authorization.

Financial Assistance Program:
- Application required; based on household income and family size.
- Discounts of 20–80% available for qualifying patients.
- Applications processed within 10 business days.
- Cannot retroactively apply financial assistance to accounts in collections.

Collections:
- Unpaid balances sent to collections after 90 days.
- Collections fee may be added — contact billing immediately if account has been referred.
- Payment arrangement before collections transfer: call billing department.

Frequently Asked Questions:
Q: Why is my bill higher than expected?
A: This may be due to your deductible, co-insurance, or a service not covered by your plan. I can walk you through the charges.

Q: Do you offer payment plans?
A: Yes, for balances over $100 we offer 3, 6, or 12-month interest-free plans.

Q: I can't afford my bill. What options do I have?
A: You may qualify for our financial assistance program. I can connect you with our billing team to apply.

Q: I think my bill is wrong. How do I dispute it?
A: Billing disputes are handled by our billing specialists. I'll transfer you or schedule a callback.
    `.trim()
  },

  {
    nameMatch: 'referral',
    sourceName: 'Referral Coordination Policy',
    text: `
REFERRAL COORDINATION POLICIES AND PROCEDURES

Referral Request Process:
- Referrals must be ordered by the patient's primary care or treating provider — they cannot be self-requested.
- Collect: patient name, DOB, referring provider name, specialist type, insurance information, urgency level.
- Urgency levels: Routine (3–5 business days), Urgent (same day), Emergent (direct ER or provider-to-provider call).

Prior Authorization:
- Required by most insurance plans before specialty visits, procedures, imaging (MRI/CT), and some lab tests.
- The referral coordination team submits the prior auth request to the insurance plan.
- Auth approval: typically 3–7 business days; urgent auth may be expedited.
- If denied: notify patient, explain appeal rights, connect with billing/clinical team for peer-to-peer review.

Specialist Scheduling:
- After approval, the referral coordinator contacts the specialist office to schedule.
- Patient will be notified of the specialist's appointment date/time by portal message or phone.
- Patient should bring: referral number, insurance card, and any relevant records.

Status Checks:
- Patients can call or chat for referral status updates.
- Verify identity before providing any referral status information.
- Status updates: Submitted → Pending Auth → Approved/Denied → Scheduled.

Frequently Asked Questions:
Q: How long does a referral take?
A: Standard referrals take 3–5 business days. If your provider marked it urgent, it's processed the same day.

Q: What is prior authorization?
A: Prior auth is your insurance company's approval before certain services are covered. We submit this on your behalf.

Q: My referral was denied. What happens now?
A: We can initiate an appeal or schedule a peer-to-peer review with your provider. Our team will contact you with options.

Q: Can I choose my own specialist?
A: You may request a specific specialist. We'll confirm they are in-network with your insurance and accept new patients.
    `.trim()
  },

  {
    nameMatch: 'symptom triage',
    sourceName: 'Symptom Triage Routing Guide',
    text: `
SYMPTOM TRIAGE ROUTING GUIDE (NON-CLINICAL INTAKE COORDINATOR)

IMPORTANT: This coordinator DOES NOT provide clinical advice, diagnose, or assess symptoms.
Role: Collect symptom description, apply routing criteria, connect patient to appropriate care level.

EMERGENCY — Advise 911 immediately for:
- Chest pain or pressure
- Difficulty breathing or shortness of breath
- Sudden severe headache ("worst headache of my life")
- Sudden weakness or numbness on one side of the body (stroke symptoms)
- Difficulty speaking or understanding speech
- Uncontrolled bleeding
- Suspected overdose or poisoning
- Unconsciousness or unresponsiveness
- Severe allergic reaction (throat tightening, difficulty swallowing)
- Suicidal ideation with plan or intent → advise 988 Suicide & Crisis Lifeline or 911

NURSE ADVICE LINE — Transfer for:
- Fever questions
- Medication side effect concerns
- Wound care questions
- Cold/flu symptom management
- Rash or skin change (non-emergency)
- General health questions
- Post-procedure concerns (non-emergency)
- Mental health concerns (non-crisis)

URGENT CARE SCHEDULING — Offer same-day appointment for:
- Fever over 101°F lasting more than 2 days
- Ear pain
- Urinary symptoms (burning, frequency, urgency)
- Sore throat (possible strep)
- Minor injury (sprain, laceration not requiring ER)
- Pink eye (conjunctivitis)
- Sinus pressure/congestion with pain

ROUTINE APPOINTMENT — Schedule within normal timeframes for:
- Annual wellness exams
- Medication management check-ins
- Chronic disease follow-up (stable)
- Preventive care (vaccinations, screenings)

Intake Questions to Ask:
1. What is the main symptom you're experiencing?
2. How long have you had this symptom?
3. Is the symptom getting better, worse, or staying the same?
4. On a scale of 1–10, how would you rate the severity?
5. Are you currently taking any medications for this?

Documentation: Record symptom description, duration, severity rating, and routing decision.
    `.trim()
  }
];

// ---------------------------------------------------------------------------
// Chunking helpers (simplified — no external deps)
// ---------------------------------------------------------------------------

function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function md5(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

function chunkText(text: string, sourceId: string, chunkSize = 1200, overlap = 150): Array<{
  chunkId: string; text: string; startIndex: number; endIndex: number; tokens: number;
}> {
  const chunks: Array<{ chunkId: string; text: string; startIndex: number; endIndex: number; tokens: number }> = [];
  let start = 0;
  let idx = 0;

  while (start < text.length) {
    const idealEnd = Math.min(start + chunkSize, text.length);
    let end = idealEnd;

    if (idealEnd < text.length) {
      const searchStart = Math.max(start, idealEnd - Math.floor(chunkSize * 0.2));
      const segment = text.slice(searchStart, idealEnd + 50);
      const periodIdx = segment.lastIndexOf('\n\n');
      if (periodIdx !== -1) end = searchStart + periodIdx + 2;
    }

    const chunkStr = text.slice(start, end).trim();
    if (chunkStr.length > 0) {
      chunks.push({
        chunkId: `${sourceId}-${idx}`,
        text: chunkStr,
        startIndex: start,
        endIndex: end,
        tokens: approxTokens(chunkStr)
      });
      idx++;
    }

    if (end >= text.length) break;
    start = end - overlap;
    if (start >= end) start = end;
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db!;
  const tenantColl = db.collection('tenant_prompt_versions');
  const ragColl = db.collection('rag_documents');

  // Find all tenant prompts for the medical product
  const tenantPrompts = await tenantColl.find({
    tenantId: TENANT_ID,
    productId: PRODUCT_ID,
    isDeleted: { $ne: true }
  }).toArray();

  console.log(`Found ${tenantPrompts.length} tenant prompts for product ${PRODUCT_ID}`);

  if (tenantPrompts.length === 0) {
    console.error('No tenant prompts found. Run seed-medical-prompts.ts first.');
    process.exit(1);
  }

  // Clear existing rag_documents for this tenant+product
  const deleted = await ragColl.deleteMany({ tenantId: TENANT_ID, promptVersionId: { $in: tenantPrompts.map(p => p._id) } });
  console.log(`Cleared ${deleted.deletedCount} existing rag_documents`);

  const now = new Date();
  let seeded = 0;

  for (const prompt of tenantPrompts) {
    // Find matching KB article by name substring (case-insensitive)
    const promptName: string = (prompt.name || '').toLowerCase();
    const article = KB_ARTICLES.find(a => promptName.includes(a.nameMatch.toLowerCase()));

    if (!article) {
      console.log(`  ⚠  No KB article matched for "${prompt.name}" — skipping`);
      continue;
    }

    const sourceId = new Types.ObjectId();
    const checksum = md5(article.text);
    const chunks = chunkText(article.text, sourceId.toString());

    // Insert rag_document
    await ragColl.insertOne({
      _id: new Types.ObjectId(),
      tenantId: TENANT_ID,
      promptVersionId: prompt._id,
      sourceId,
      filename: `${article.sourceName}.txt`,
      fileType: 'txt',
      fileSize: article.text.length,
      uploadedBy: 'system-seed',
      uploadedAt: now,
      storageLocation: 'extracted_inline',
      checksum,
      status: 'indexed',
      processingStartedAt: now,
      processingCompletedAt: now,
      extractedText: article.text,
      extractedMetadata: {
        title: article.sourceName,
        language: 'en'
      },
      chunks,
      vectorStore: {
        provider: 'none',
        indexName: 'keyword_only',
        syncedAt: now,
        chunkCount: chunks.length,
        syncStatus: 'pending'   // will become 'synced' once embeddings are generated
      },
      usage: { retrievalCount: 0 },
      createdAt: now,
      updatedAt: now
    });

    // Also enable ragConfig on the tenant prompt if not already enabled
    const ragSource = {
      _id: sourceId,
      type: 'document',
      name: article.sourceName,
      enabled: true,
      config: { seeded: true },
      chunkSize: 1200,
      chunkOverlap: 150,
      status: 'active',
      lastRefreshedAt: now,
      stats: { totalChunks: chunks.length, lastSyncDuration: 0, errorCount: 0 }
    };

    await tenantColl.updateOne(
      { _id: prompt._id },
      {
        $set: {
          'content.ragConfig.enabled': true,
          'content.ragConfig.retrieval': {
            maxResults: 5,
            minScore: 0.1,
            hybridSearch: false
          }
        },
        $push: { 'content.ragConfig.sources': ragSource } as any
      }
    );

    console.log(`  ✓ Seeded RAG for "${prompt.name}" (${chunks.length} chunks) [${prompt.channelType}]`);
    seeded++;
  }

  // Summary
  const totalRag = await ragColl.countDocuments({ tenantId: TENANT_ID, promptVersionId: { $in: tenantPrompts.map(p => p._id) } });
  console.log(`\n── Summary ─────────────────────────────────────────────────`);
  console.log(`  Tenant prompts processed: ${tenantPrompts.length}`);
  console.log(`  rag_documents seeded:     ${seeded}`);
  console.log(`  rag_documents total:      ${totalRag}`);
  console.log(`  Retrieval mode:           keyword (run rag:create-index for vector search)`);
  console.log(`────────────────────────────────────────────────────────────`);

  await mongoose.disconnect();
  console.log('\nDone.');
}

run().catch(err => {
  console.error('Seed failed:', err);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});
