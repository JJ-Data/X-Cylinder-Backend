'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('swap_records', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      lease_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'lease_records',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      old_cylinder_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'cylinders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      new_cylinder_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'cylinders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      staff_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      swap_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      condition: {
        type: Sequelize.ENUM('good', 'poor', 'damaged'),
        allowNull: false,
        defaultValue: 'good'
      },
      weight_recorded: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        validate: {
          min: 0
        }
      },
      damage_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      swap_fee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          min: 0
        }
      },
      reason_for_fee: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      receipt_printed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('swap_records', ['lease_id']);
    await queryInterface.addIndex('swap_records', ['old_cylinder_id']);
    await queryInterface.addIndex('swap_records', ['new_cylinder_id']);
    await queryInterface.addIndex('swap_records', ['staff_id']);
    await queryInterface.addIndex('swap_records', ['swap_date']);
    await queryInterface.addIndex('swap_records', ['condition']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('swap_records');
  }
};