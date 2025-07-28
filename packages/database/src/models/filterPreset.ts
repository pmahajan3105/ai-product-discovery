import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

// Define the filters interface inline to avoid circular imports
export interface FilterPresetFilters {
  search?: string;
  status?: string[];
  category?: string[];
  assignedTo?: string[];
  customerId?: string[];
  integrationId?: string[];
  priority?: string[];
  source?: string[];
  sentiment?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  hasCustomer?: boolean;
  isAssigned?: boolean;
}

export interface FilterPresetAttributes {
  id: string;
  name: string;
  filters: FilterPresetFilters;
  createdBy: string;
  organizationId: string;
  isDefault: boolean;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FilterPresetInput extends Optional<FilterPresetAttributes, 'id' | 'createdAt' | 'updatedAt' | 'isDefault' | 'isShared'> {}

export class FilterPreset extends Model<FilterPresetAttributes, FilterPresetInput> implements FilterPresetAttributes {
  public id!: string;
  public name!: string;
  public filters!: FilterPresetFilters;
  public createdBy!: string;
  public organizationId!: string;
  public isDefault!: boolean;
  public isShared!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export const initFilterPreset = (sequelize: Sequelize): typeof FilterPreset => {
  FilterPreset.init(
    {
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
      },
      organizationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'organizations',
          key: 'id',
        },
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
    },
    {
      sequelize,
      tableName: 'filter_presets',
      timestamps: true,
      indexes: [
        {
          fields: ['organizationId', 'createdBy'],
        },
        {
          fields: ['organizationId', 'isShared'],
        },
        {
          fields: ['organizationId', 'createdBy', 'name'],
          unique: true,
        },
      ],
    }
  );

  return FilterPreset;
};

export default FilterPreset;