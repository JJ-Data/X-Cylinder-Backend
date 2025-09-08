'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Check if columns exist before removing them
      const tableDescription = await queryInterface.describeTable('business_settings');
      
      // Remove unnecessary columns if they exist
      if (tableDescription.priority) {
        await queryInterface.removeColumn('business_settings', 'priority', { transaction });
      }
      if (tableDescription.version) {
        await queryInterface.removeColumn('business_settings', 'version', { transaction });
      }
      if (tableDescription.effective_date) {
        await queryInterface.removeColumn('business_settings', 'effective_date', { transaction });
      }
      if (tableDescription.expiry_date) {
        await queryInterface.removeColumn('business_settings', 'expiry_date', { transaction });
      }
      if (tableDescription.customer_tier) {
        await queryInterface.removeColumn('business_settings', 'customer_tier', { transaction });
      }
      
      // Drop pricing_rules table if exists
      const [tables] = await queryInterface.sequelize.query(
        "SHOW TABLES LIKE 'pricing_rules'",
        { transaction }
      );
      
      if (tables.length > 0) {
        await queryInterface.dropTable('pricing_rules', { transaction });
      }
      
      // Drop settings_audit table if exists
      const [auditTables] = await queryInterface.sequelize.query(
        "SHOW TABLES LIKE 'settings_audit'",
        { transaction }
      );
      
      if (auditTables.length > 0) {
        await queryInterface.dropTable('settings_audit', { transaction });
      }
      
      await transaction.commit();
      console.log('Settings structure simplified successfully');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      const tableDescription = await queryInterface.describeTable('business_settings');
      
      // Restore columns if they don't exist
      if (!tableDescription.priority) {
        await queryInterface.addColumn('business_settings', 'priority', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        }, { transaction });
      }
      
      if (!tableDescription.version) {
        await queryInterface.addColumn('business_settings', 'version', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1
        }, { transaction });
      }
      
      if (!tableDescription.effective_date) {
        await queryInterface.addColumn('business_settings', 'effective_date', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }, { transaction });
      }
      
      if (!tableDescription.expiry_date) {
        await queryInterface.addColumn('business_settings', 'expiry_date', {
          type: Sequelize.DATE,
          allowNull: true
        }, { transaction });
      }
      
      if (!tableDescription.customer_tier) {
        await queryInterface.addColumn('business_settings', 'customer_tier', {
          type: Sequelize.ENUM('regular', 'business', 'premium'),
          allowNull: true
        }, { transaction });
      }
      
      await transaction.commit();
      console.log('Settings structure restored successfully');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
