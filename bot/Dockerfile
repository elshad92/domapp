FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy bot code into /app/bot so that "from bot.handlers..." imports work
COPY . /app/bot

# Run the bot from the bot package directory
CMD ["python", "-m", "bot.main"]
