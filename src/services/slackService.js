import axios from 'axios';
import config from '../../src/config/env.js';

// 환경 변수 확인
console.log('Current NODE_ENV:', config.NODE_ENV);
console.log('SLACK_WEBHOOK_URL:', config.SLACK_WEBHOOK_URL);

// 체인 카테고리 정의
const CHAIN_CATEGORIES = {
  TRANSACTION: '거래 정보',
  ACCOUNT: '계좌 정보',
  SUBSCRIPTION: '청약 정보'
};

// 체인 타입 정의
const CHAIN_TYPES = {
  'user.created': '계좌 생성',
  'transaction.created': '거래 생성',
  'wallet.created': '지갑 생성',
  'subscription.accept': '청약 신청'
};

export const sendSlackNotification = async (notification) => {
  try {
    const { originalTopic, error, timestamp, customerId } = notification.data;
    const chainType = CHAIN_TYPES[originalTopic] || originalTopic;
    const category = originalTopic.includes('subscription') 
      ? CHAIN_CATEGORIES.SUBSCRIPTION 
      : originalTopic.includes('transaction') 
        ? CHAIN_CATEGORIES.TRANSACTION 
        : CHAIN_CATEGORIES.ACCOUNT;
    
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
              text: `*Customer ID:* ${customerId || 'unknown'}`
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

    await axios.post(config.SLACK_WEBHOOK_URL, message);
    console.log(`Slack notification sent for customer ${customerId || 'unknown'}`);
  } catch (error) {
    console.error('Error sending Slack notification:', {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
      customerId: customerId || 'unknown',
      webhook: config.SLACK_WEBHOOK_URL
    });
  }
}; 