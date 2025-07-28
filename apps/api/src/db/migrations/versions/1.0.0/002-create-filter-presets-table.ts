import { QueryInterface, DataTypes } from 'sequelize';
import { BaseMigration } from '../../BaseMigration';

export class CreateFilterPresetsTable extends BaseMigration {
  public name = 'CreateFilterPresetsTable';
  public version = '1.0.0';

  public async up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.createTable('filter_presets', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      filters: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      organizationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'organizations',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isShared: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    // Add indexes
    await queryInterface.addIndex('filter_presets', ['organizationId', 'createdBy'], {
      name: 'idx_filter_presets_org_creator',
    });

    await queryInterface.addIndex('filter_presets', ['organizationId', 'isShared'], {
      name: 'idx_filter_presets_org_shared',
    });

    await queryInterface.addIndex('filter_presets', ['organizationId', 'createdBy', 'name'], {
      unique: true,
      name: 'idx_filter_presets_unique_name',
    });
  }

  public async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.dropTable('filter_presets');
  }
}