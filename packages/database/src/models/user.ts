import { DataTypes, Model, Sequelize, Op } from 'sequelize';

export interface UserAttributes {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  profileImage?: string;
  isEmailVerified: boolean;
  provider: 'email' | 'google';
  googleId?: string;
  lastActivityTime?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User extends Model<UserAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public firstName!: string;
  public lastName!: string;
  public password?: string;
  public profileImage?: string;
  public isEmailVerified!: boolean;
  public provider!: 'email' | 'google';
  public googleId?: string;
  public lastActivityTime?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Computed properties
  public get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}

export const initUser = (sequelize: Sequelize): typeof User => {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 100],
        },
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 100],
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true, // Allow null for OAuth users
      },
      profileImage: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isEmailVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      provider: {
        type: DataTypes.ENUM('email', 'google'),
        allowNull: false,
        defaultValue: 'email',
      },
      googleId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      lastActivityTime: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      // indexes: [
      //   {
      //     unique: true,
      //     fields: ['email'],
      //   },
      //   {
      //     fields: ['provider'],
      //   },
      //   {
      //     fields: ['lastActivityTime'],
      //   },
      // ],
      defaultScope: {
        attributes: {
          exclude: ['password'], // Never return password by default
        },
      },
      scopes: {
        withPassword: {
          attributes: {
            include: ['password'],
          },
        },
      },
    }
  );

  return User;
};