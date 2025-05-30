import axios from 'axios';
import config from '../../src/config/env.js';

// 환경 변수 확인
console.log('Current NODE_ENV:', process.env.NODE_ENV);
console.log('SLACK_WEBHOOK_URL:', process.env.SLACK_WEBHOOK_URL);

// 체인 카테고리 정의
const CHAIN_CATEGORIES = {
  TRANSACTION: '거래 정보',
  ACCOUNT: '계좌 정보'
};

// 체인 타입 정의
const CHAIN_TYPES = {
  'user.created': '계좌 생성',
  'transaction.created': '거래 생성',
  'wallet.created': '지갑 생성'
};

export const sendSlackNotification = async (notification) => {
  try {
    const { originalTopic, error, timestamp } = notification.data;
    const chainType = CHAIN_TYPES[originalTopic] || originalTopic;
    const category = originalTopic.includes('transaction') ? CHAIN_CATEGORIES.TRANSACTION : CHAIN_CATEGORIES.ACCOUNT;
    
    const message = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `🚨 ${category} 처리 실패`,
            emoji: true
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*체인 타입:*\n${chainType}`
            },
            {
              type: "mrkdwn",
              text: `*발생 시간:*\n${new Date(timestamp).toLocaleString('ko-KR')}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*오류 내용:*\n\`\`\`${error}\`\`\``
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `*User ID:* ${notification.userId}`
            }
          ]
        }
      ]
    };

    // 스택 트레이스가 있는 경우 추가
    if (notification.data.stack) {
      message.blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*스택 트레이스:*\n\`\`\`${notification.data.stack}\`\`\``
        }
      });
    }

    // 원본 메시지가 있는 경우 추가
    if (notification.data.originalMessage) {
      message.blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*원본 메시지:*\n\`\`\`${JSON.stringify(notification.data.originalMessage, null, 2)}\`\`\``
        }
      });
    }

    await axios.post(process.env.SLACK_WEBHOOK_URL, message);
    console.log(`Slack notification sent for user ${notification.userId}`);
  } catch (error) {
    console.error('Error sending Slack notification:', error);
  }
}; 