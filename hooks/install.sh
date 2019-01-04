#!/bin/bash

cd /home/ec2-user/repos/issues-discord-bot
/home/ec2-user/.nvm/versions/node/v11.5.0/bin/npm install

REGION=$(curl -s 169.254.169.254/latest/meta-data/local-hostname | cut -d '.' -f2)
PARAMETER_NAME=ISSUES_DISCORD_BOT_SECRET
echo "DISCORD_BOT_TOKEN=$(aws --region ${REGION} ssm get-parameter --name ${PARAMETER_NAME} --query "Parameter.Value" --output text)" > environment

sudo cp ./hooks/issues-discord-bot.service /etc/systemd/system/issues-discord-bot.service
sudo /usr/bin/systemctl enable issues-discord-bot
