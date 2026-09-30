# Runbook: Network Error

## Symptoms
Payment fails, is pending or parked because the connection itself could not be made or was broken, before any system could respond.

## Log Signals
- "Connection refused", "host unreachable", "DNS resolution failed", "ENOTFOUND"
- "Connection reset by peer", "TCP handshake incomplete"
- HTTP 502 Bad Gateway from an intermediary

## Checks
1. Check whether the failure affects one endpoint or many.
2. Confirm DNS, firewall and network routes to the target host.
3. For payments cut off mid-transmission, re-query status to check whether the request was received.

## Fix
- Work with the network or infrastructure team to restore connectivity.
- Once connectivity is restored, retry payments that never reached the target.
- For payments with unclear delivery, re-query status before any retry.

## Prevention
- Monitor connectivity to all critical endpoints.
- Use failover routes where available.
- Distinguish "never sent" from "sent but no reply" in logs and error codes.

## Client Communication
"The payment was interrupted by a network connectivity issue between systems. Connectivity has been restored and the payment has been [retried / verified]."
