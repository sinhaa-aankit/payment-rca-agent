# Runbook: Core Banking Timeout

## Symptoms
Payment is stuck in PDNG, PARK or FAIL. The connection to core banking was established and the request was sent, but no response arrived within the allowed window.

## Log Signals
- "Connection established" or "handshake OK" followed by "no response after N ms"
- "Awaiting acknowledgement", "still waiting", "processing queue IN_PROGRESS"
- Retry attempts that reach core but still get no reply

## Checks
1. Check core banking health dashboards for latency or high load at the time of the payment.
2. Re-query the transaction status in core banking using the payment reference.
3. Confirm whether the debit was actually posted in core before taking any action.

## Fix
- If core shows the debit as posted, mark the payment successful and reconcile. Do not retry.
- If core shows no debit, the payment can be safely retried once.
- If core status is unclear, park the payment and escalate to the core banking team.

## Prevention
- Always re-query status before retrying a timed-out payment, to avoid duplicate debits.
- Alert on sustained core latency above the timeout threshold.

## Client Communication
"The payment was delayed because the core banking system did not respond in time. We have verified its status and it has now been [completed / safely retried / escalated]."
