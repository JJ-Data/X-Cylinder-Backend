'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, rename the transferred_by_id column to initiated_by_id
    await queryInterface.renameColumn('transfer_records', 'transferred_by_id', 'initiated_by_id');
    
    // Add new columns
    await queryInterface.addColumn('transfer_records', 'accepted_by_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.addColumn('transfer_records', 'status', {
      type: Sequelize.ENUM('pending', 'completed', 'rejected'),
      allowNull: false,
      defaultValue: 'completed', // Default to completed for existing records
    });

    await queryInterface.addColumn('transfer_records', 'rejection_reason', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('transfer_records', 'accepted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('transfer_records', 'rejected_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Update existing records to have proper accepted_by_id and accepted_at
    await queryInterface.sequelize.query(`
      UPDATE transfer_records 
      SET 
        accepted_by_id = initiated_by_id,
        accepted_at = transfer_date
      WHERE status = 'completed'
    `);

    // Add indexes for the new columns
    await queryInterface.addIndex('transfer_records', ['accepted_by_id']);
    await queryInterface.addIndex('transfer_records', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('transfer_records', ['accepted_by_id']);
    await queryInterface.removeIndex('transfer_records', ['status']);

    // Remove columns
    await queryInterface.removeColumn('transfer_records', 'rejected_at');
    await queryInterface.removeColumn('transfer_records', 'accepted_at');
    await queryInterface.removeColumn('transfer_records', 'rejection_reason');
    await queryInterface.removeColumn('transfer_records', 'status');
    await queryInterface.removeColumn('transfer_records', 'accepted_by_id');
    
    // Rename column back
    await queryInterface.renameColumn('transfer_records', 'initiated_by_id', 'transferred_by_id');
  },
};