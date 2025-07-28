import { DataTypes, Model, Sequelize } from 'sequelize';

export interface OrganizationAttributes {
  id: string;
  name: string;
  description?: string;
  image?: string;
  uniqueName: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Organization extends Model<OrganizationAttributes> implements OrganizationAttributes {
  public id!: string;
  public name!: string;
  public description?: string;
  public image?: string;
  public uniqueName!: string;
  public createdBy!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export const initOrganization = (sequelize: Sequelize): typeof Organization => {
  Organization.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 200],
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      uniqueName: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          is: /^[a-z0-9-]+$/i, // Only alphanumeric and hyphens
          len: [3, 50],
        },
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'Organization',
      tableName: 'organizations',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['uniqueName'],
        },
        {
          fields: ['createdBy'],
        },
        {
          fields: ['name'],
        },
      ],
    }
  );

  return Organization;
};