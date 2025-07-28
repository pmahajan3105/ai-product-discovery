/**
 * Company Profile Model
 * Stores company context and profile information for AI processing
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface CompanyProfileAttributes {
  id: string;
  organizationId: string;
  industry: 'SaaS' | 'E-commerce' | 'Fintech' | 'Healthcare' | 'EdTech' | 'Other';
  productType?: string;
  companySize: 'Startup' | 'SMB' | 'Mid-Market' | 'Enterprise';
  customerSegments?: Array<{
    name: string;
    characteristics: string[];
    value: 'Enterprise' | 'Mid-Market' | 'SMB';
    percentage?: number;
  }>;
  businessGoals?: string[];
  competitivePosition?: string;
  currentChallenges?: string[];
  productFeatures?: string[];
  targetMarket?: string;
  categoryMapping?: Record<string, string[]>;
  priorityKeywords?: string[];
  customerValueWords?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class CompanyProfile extends Model<CompanyProfileAttributes> implements CompanyProfileAttributes {
  public id!: string;
  public organizationId!: string;
  public industry!: 'SaaS' | 'E-commerce' | 'Fintech' | 'Healthcare' | 'EdTech' | 'Other';
  public productType?: string;
  public companySize!: 'Startup' | 'SMB' | 'Mid-Market' | 'Enterprise';
  public customerSegments?: Array<{
    name: string;
    characteristics: string[];
    value: 'Enterprise' | 'Mid-Market' | 'SMB';
    percentage?: number;
  }>;
  public businessGoals?: string[];
  public competitivePosition?: string;
  public currentChallenges?: string[];
  public productFeatures?: string[];
  public targetMarket?: string;
  public categoryMapping?: Record<string, string[]>;
  public priorityKeywords?: string[];
  public customerValueWords?: string[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initModel(sequelize: Sequelize): typeof CompanyProfile {
    CompanyProfile.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        organizationId: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
        },
        industry: {
          type: DataTypes.ENUM('SaaS', 'E-commerce', 'Fintech', 'Healthcare', 'EdTech', 'Other'),
          allowNull: false,
          defaultValue: 'Other',
        },
        productType: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        companySize: {
          type: DataTypes.ENUM('Startup', 'SMB', 'Mid-Market', 'Enterprise'),
          allowNull: false,
          defaultValue: 'SMB',
        },
        customerSegments: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        businessGoals: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        competitivePosition: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        currentChallenges: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        productFeatures: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        targetMarket: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        categoryMapping: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        priorityKeywords: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        customerValueWords: {
          type: DataTypes.JSONB,
          allowNull: true,
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
        modelName: 'CompanyProfile',
        tableName: 'company_profiles',
        timestamps: true,
      }
    );

    return CompanyProfile;
  }

  public static associate(models: any): void {
    CompanyProfile.belongsTo(models.Organization, {
      foreignKey: 'organizationId',
      as: 'organization',
    });
  }
}