# Runbook: Duplicate Payment

## Symptoms
Payment is rejected, failed or parked because a payment with the same reference, idempotency key, or identical details was already processed.

## Log Signals
- "Reference already exists", "matched existing settled entry"
- "Idempotency key already used", "hash already exists in processed batch"
- A retry after a timeout that finds the original already posted
- Identical amount and beneficiary within a short time window

## Checks
1. Find the original payment and confirm its final status.
2. Check whether the customer was debited once or twice.
3. Identify the source: client resubmission, automatic retry, or a batch uploaded twice.

## Fix
- If only one debit happened, close the duplicate as rejected. No money movement is needed.
- If two debits happened, initiate a reversal for the second one and reconcile.
- If a retry caused it, fix the retry logic to re-query status before resending.

## Prevention
- Enforce idempotency keys on all payment APIs.
- Never retry a timed-out payment without first checking its status.

## Client Communication
"This payment was identified as a duplicate of an earlier transaction that was already processed. [No additional debit occurred / The extra debit has been reversed]."
