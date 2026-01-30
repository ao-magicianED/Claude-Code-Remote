/**
 * Discord Notification Channel
 * Sends notifications via Discord Webhook
 */

const NotificationChannel = require('../base/channel');
const axios = require('axios');

class DiscordChannel extends NotificationChannel {
    constructor(config = {}) {
        super('discord', config);
        this._validateConfig();
    }

    _validateConfig() {
        if (!this.config.webhook) {
            this.logger.warn('Discord Webhook URL not configured');
            return false;
        }
        return true;
    }

    async _sendImpl(notification) {
        if (!this._validateConfig()) {
            throw new Error('Discord channel not properly configured');
        }

        const embed = this._buildEmbed(notification);

        const payload = {
            username: this.config.username || 'Claude-Code-Remote',
            avatar_url: this.config.avatar || null,
            embeds: [embed]
        };

        try {
            await axios.post(this.config.webhook, payload, {
                headers: { 'Content-Type': 'application/json' }
            });

            this.logger.info('Discord notification sent successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to send Discord notification:', error.response?.data || error.message);
            return false;
        }
    }

    _buildEmbed(notification) {
        const isCompleted = notification.type === 'completed';

        // 日本語でわかりやすいメッセージ
        const title = isCompleted
            ? '✅ Claudeの作業が完了しました！'
            : '⏳ Claudeがあなたの指示を待っています';

        const description = isCompleted
            ? '作業が終わりました。結果を確認して、次の指示を出してください。'
            : '入力が必要です。Claude Codeを確認してください。';

        const embed = {
            title: title,
            description: description,
            color: isCompleted ? 0x00ff00 : 0xffaa00, // 緑 or オレンジ
            fields: [
                {
                    name: '📁 プロジェクト名',
                    value: notification.project || '不明',
                    inline: true
                },
                {
                    name: '🕐 通知時刻',
                    value: new Date().toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    inline: true
                },
                {
                    name: '📌 ステータス',
                    value: isCompleted ? '完了' : '入力待ち',
                    inline: true
                }
            ],
            footer: {
                text: '🤖 Claude Code からの通知'
            },
            timestamp: new Date().toISOString()
        };

        // 質問内容があれば追加
        if (notification.metadata?.userQuestion) {
            embed.fields.push({
                name: '💬 あなたの質問',
                value: notification.metadata.userQuestion.substring(0, 200) +
                       (notification.metadata.userQuestion.length > 200 ? '...' : ''),
                inline: false
            });
        }

        // Claudeの応答があれば追加
        if (notification.metadata?.claudeResponse) {
            embed.fields.push({
                name: '🤖 Claudeの回答（一部）',
                value: notification.metadata.claudeResponse.substring(0, 300) +
                       (notification.metadata.claudeResponse.length > 300 ? '...' : ''),
                inline: false
            });
        }

        return embed;
    }

    validateConfig() {
        return this._validateConfig();
    }
}

module.exports = DiscordChannel;
