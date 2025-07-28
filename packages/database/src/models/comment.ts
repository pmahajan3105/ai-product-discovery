import { DataTypes, Model, Sequelize } from 'sequelize';

export interface CommentAttributes {
  id: string;
  feedbackId: string;
  userId: string;
  parentCommentId?: string;
  content: string;
  mentions?: Record<string, any>;
  isInternal: boolean;
  attachments?: Record<string, any>;
  reactions?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Comment extends Model<CommentAttributes> implements CommentAttributes {
  public id!: string;
  public feedbackId!: string;
  public userId!: string;
  public parentCommentId?: string;
  public content!: string;
  public mentions?: Record<string, any>;
  public isInternal!: boolean;
  public attachments?: Record<string, any>;
  public reactions?: Record<string, any>;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Computed properties
  public get isThreadRoot(): boolean {
    return this.parentCommentId === null || this.parentCommentId === undefined;
  }

  public get hasMentions(): boolean {
    return !!(this.mentions && Object.keys(this.mentions).length > 0);
  }

  public get hasReactions(): boolean {
    return !!(this.reactions && Object.keys(this.reactions).length > 0);
  }
}

export const initComment = (sequelize: Sequelize): typeof Comment => {
  Comment.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      feedbackId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'feedback',
          key: 'id',
        },
      },
      parentCommentId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'comments',
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
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      mentions: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      isInternal: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      attachments: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      reactions: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Comment',
      tableName: 'comments',
      timestamps: true,
      indexes: [
        {
          fields: ['feedbackId'],
        },
        {
          fields: ['parentCommentId'],
        },
        {
          fields: ['userId'],
        },
        {
          fields: ['isInternal'],
        },
        {
          fields: ['createdAt'],
        },
        {
          fields: ['feedbackId', 'createdAt'],
        },
      ],
    }
  );

  return Comment;
};