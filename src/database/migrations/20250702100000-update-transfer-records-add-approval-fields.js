'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // --- Guard: skip if table doesn't exist ---
    const tables = await queryInterface.showAllTables();
    const tableNames = tables
      .map((t) => (typeof t === 'string' ? t : t.tableName || t.name))
      .filter(Boolean)
      .map((t) => String(t).toLowerCase());

    const hasTransferRecords = tableNames.includes('transfer_records');
    if (!hasTransferRecords) {
      console.log('⚠️ Skipping migration: transfer_records table does not exist.');
      return;
    }

    // Describe table once for column checks
    const desc = await queryInterface.describeTable('transfer_records');

    // 1) Rename transferred_by_id -> initiated_by_id (only if needed)
    if (desc.transferred_by_id && !desc.initiated_by_id) {
      await queryInterface.renameColumn('transfer_records', 'transferred_by_id', 'initiated_by_id');
    }

    // Refresh description after rename
    const desc2 = await queryInterface.describeTable('transfer_records');

    // 2) Add accepted_by_id if missing
    if (!desc2.accepted_by_id) {
      await queryInterface.addColumn('transfer_records', 'accepted_by_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }

    // 3) Add status if missing
    if (!desc2.status) {
      await queryInterface.addColumn('transfer_records', 'status', {
        type: Sequelize.ENUM('pending', 'completed', 'rejected'),
        allowNull: false,
        defaultValue: 'completed',
      });
    }

    // 4) Add rejection_reason if missing
    if (!desc2.rejection_reason) {
      await queryInterface.addColumn('transfer_records', 'rejection_reason', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    // 5) Add accepted_at if missing
    if (!desc2.accepted_at) {
      await queryInterface.addColumn('transfer_records', 'accepted_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    // 6) Add rejected_at if missing
    if (!desc2.rejected_at) {
      await queryInterface.addColumn('transfer_records', 'rejected_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    // 7) Update existing records safely
    // Only run if the required columns exist
    const finalDesc = await queryInterface.describeTable('transfer_records');
    const hasInitiatedBy = !!finalDesc.initiated_by_id;
    const hasAcceptedBy = !!finalDesc.accepted_by_id;
    const hasAcceptedAt = !!finalDesc.accepted_at;
    const hasTransferDate = !!finalDesc.transfer_date;
    const hasStatus = !!finalDesc.status;

    if (hasInitiatedBy && hasAcceptedBy && hasAcceptedAt && hasTransferDate && hasStatus) {
      await queryInterface.sequelize.query(`
        UPDATE transfer_records
        SET
          accepted_by_id = initiated_by_id,
          accepted_at = transfer_date
        WHERE status = 'completed'
          AND accepted_by_id IS NULL
      `);
    }

    // 8) Add indexes (guarded)
    // MySQL requires unique names; use explicit names to avoid duplicates
    try {
      await queryInterface.addIndex('transfer_records', ['accepted_by_id'], {
        name: 'idx_transfer_records_accepted_by_id',
      });
    } catch (e) {}

    try {
      await queryInterface.addIndex('transfer_records', ['status'], {
        name: 'idx_transfer_records_status',
      });
    } catch (e) {}
  },

  down: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables
      .map((t) => (typeof t === 'string' ? t : t.tableName || t.name))
      .filter(Boolean)
      .map((t) => String(t).toLowerCase());

    if (!tableNames.includes('transfer_records')) return;

    // Remove indexes if they exist
    try {
      await queryInterface.removeIndex('transfer_records', 'idx_transfer_records_accepted_by_id');
    } catch (e) {}
    try {
      await queryInterface.removeIndex('transfer_records', 'idx_transfer_records_status');
    } catch (e) {}

    const desc = await queryInterface.describeTable('transfer_records');

    // Remove columns if they exist
    if (desc.rejected_at) await queryInterface.removeColumn('transfer_records', 'rejected_at');
    if (desc.accepted_at) await queryInterface.removeColumn('transfer_records', 'accepted_at');
    if (desc.rejection_reason)
      await queryInterface.removeColumn('transfer_records', 'rejection_reason');

    if (desc.status) {
      await queryInterface.removeColumn('transfer_records', 'status');
      // also drop ENUM type on some dialects (MySQL doesn't need explicit drop)
    }

    if (desc.accepted_by_id)
      await queryInterface.removeColumn('transfer_records', 'accepted_by_id');

    // Rename initiated_by_id back only if it exists and old doesn't
    const desc2 = await queryInterface.describeTable('transfer_records');
    if (desc2.initiated_by_id && !desc2.transferred_by_id) {
      await queryInterface.renameColumn('transfer_records', 'initiated_by_id', 'transferred_by_id');
    }
  },
};
