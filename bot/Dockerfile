FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY bot/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy bot package and backend shared helpers.
COPY bot ./bot
COPY backend ./backend

# Run the bot from the bot package directory
CMD ["python", "-m", "bot.main"]
