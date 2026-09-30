# Runbook: Insufficient Balance

## Symptoms
Payment is rejected or failed at the debit step. The remitter account does not have enough available funds to cover the amount.

## Log Signals
- "Available balance" lower than "requested amount"
- "Shortfall detected", "funds not adequate", issuer response code 51
- Balance check or ledger validation failure before debit

## Checks
1. Confirm the available balance at the time of the payment, including holds and pending debits.
2. Check whether an earlier payment reduced the balance, especially a possible duplicate.
3. Verify the amount on the payment matches what the client intended.

## Fix
- If the balance was genuinely low, no system fix is needed. Inform the client to fund the account and resubmit.
- If an earlier duplicate debit caused the low balance, treat it as a duplicate payment and follow that runbook instead.

## Prevention
- Show available balance before submission where possible.
- Flag repeated balance failures for the same account.

## Client Communication
"The payment could not be processed because the source account did not have sufficient available balance at the time. Please fund the account and resubmit."
