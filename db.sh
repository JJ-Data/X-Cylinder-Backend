#!/bin/bash

# Source the .env file
if [ -f .env ]; then
  # Get NODE_ENV value
  NODE_ENV=$(grep NODE_ENV .env | cut -d '=' -f2)

  # Set DB name based on environment
  if [ "$NODE_ENV" = "staging" ] || [ "$NODE_ENV" = "production" ]; then
    export DB_NAME=$(grep "^DB_NAME=" .env | cut -d '=' -f2)
  else
    export DB_NAME=$(grep "^DB_NAME_SANDBOX=" .env | cut -d '=' -f2)
  fi

  # Set other DB connection details
  export DB_USER=$(grep "^DB_USER=" .env | cut -d '=' -f2)
  export DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d '=' -f2)
  export DB_HOST=$(grep "^DB_HOST=" .env | cut -d '=' -f2)
  export DB_PORT=$(grep "^DB_PORT=" .env | cut -d '=' -f2)

fi

mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME -P $DB_PORT
if [ $? -ne 0 ]; then
  echo "Error: Unable to connect to the database."
  exit 1
fi
