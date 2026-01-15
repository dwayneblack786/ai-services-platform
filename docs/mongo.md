# MongoDB Database Schema - Payment System

📑 **Table of Contents**
- [Entity Relationship Diagram](#entity-relationship-diagram)

---

## Entity Relationship Diagram

```
+-------------+        +---------------+        +-----------+
|  customers  | 1    * | subscriptions | *    1 | products  |
+-------------+        +---------------+        +-----------+
       |                       |
       | 1                     | 1
       |                       |
       | *                     | *
+-------------+        +---------------+
|   invoices  |        | usage_events  |  (optional, for raw metering)
+-------------+        +---------------+