# Database Seeders

This directory contains seed data for the CylinderX application. The seeders are numbered to ensure they run in the correct order due to foreign key dependencies.

## Execution Order

1. **20240101000001-demo-outlets.js** - Creates outlet records
2. **20240101000002-demo-users.js** - Creates user records (depends on outlets)
3. **20240101000003-demo-cylinders.js** - Creates cylinder records (depends on outlets)
4. **20240101000004-demo-lease-records.js** - Creates lease records (depends on users, outlets, cylinders)
5. **20240101000005-demo-refill-records.js** - Creates refill records (depends on users, outlets, cylinders)
6. **20240101000006-demo-transfer-records.js** - Creates transfer records (depends on users, outlets, cylinders)

## Test Data Details

### Outlets (4 records)
- Main Outlet (active)
- North Branch (active)
- South Branch (active)
- East Branch (inactive)

### Users (10 records)
- 1 Admin user
- 2 Managers (assigned to Main and North outlets)
- 2 Staff members
- 2 Refill operators
- 3 Customers

**Default password for all users**: `Test@123`

### Cylinders (75 records per outlet)
- 10 x 5kg cylinders
- 8 x 10kg cylinders
- 5 x 15kg cylinders
- 2 x 50kg cylinders

Status distribution:
- 70% available
- 20% leased
- 10% refilling

### Lease Records
- Active leases for cylinders marked as 'leased'
- Historical returned leases with refund calculations

### Refill Records
- Multiple refill records per cylinder showing refill history
- Includes batch numbers and cost calculations

### Transfer Records
- Shows cylinder movements between outlets
- Includes transfer reasons and staff information

## Running Seeders

To seed the database:

```bash
cd api
pnpm run db:seed
```

To undo all seeders:

```bash
cd api
pnpm run db:seed:undo:all
```

## Notes

- All timestamps use proper database field names (snake_case)
- Foreign key relationships are properly maintained
- The seeders handle the circular dependency between outlets and users (managers)
- Realistic data patterns are generated (e.g., gas volumes, dates, costs)