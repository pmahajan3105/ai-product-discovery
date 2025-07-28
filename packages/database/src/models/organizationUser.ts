import { DataTypes, Model, Sequelize } from 'sequelize';

export interface OrganizationUserAttributes {
  id: string;
  userId: string;
  organizationId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: Date;
  invitedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class OrganizationUser extends Model<OrganizationUserAttributes> implements OrganizationUserAttributes {
  public id!: string;
  public userId!: string;
  public organizationId!: string;
  public role!: 'owner' | 'admin' | 'member' | 'viewer';
  public joinedAt!: Date;
  public invitedBy?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export const initOrganizationUser = (sequelize: Sequelize): typeof OrganizationUser => {
  OrganizationUser.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      organizationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'organizations',
          key: 'id',
        },
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      role: {
        type: DataTypes.ENUM('owner', 'admin', 'member', 'viewer'),
        allowNull: false,
        defaultValue: 'member',
      },
      joinedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      invitedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'OrganizationUser',
      tableName: 'organization_users',
      timestamps: true,
      indexes: [
        {
          unique: true,  
          fields: ['userId', 'organizationId'],
        },
        {
          fields: ['userId'],
        },
        {
          fields: ['organizationId'],
        },
        {
          fields: ['role'],
        },
      ],
    }
  );

  return OrganizationUser;
};