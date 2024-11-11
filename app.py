from flask import Flask, request, jsonify
import mysql.connector
import memcache
import urllib.parse
from mysql.connector import Error

mc = memcache.Client(['0.0.0.0:11211'], debug=0)

# Initialize Flask application
app = Flask(__name__)


# Database connection function
def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='hw9',
            user='root',  # Replace with your MySQL username
            password='sql'  # Replace with your MySQL password
        )
        return connection
    except Error as e:
        print(f"Error while connecting to MySQL: {e}")
        return None

# Define the route to handle the GET request
@app.route('/hw6', methods=['GET'])
def get_related_players():
    # Get player name from query parameter
    player_name = request.args.get('player')
    if not player_name:
        return jsonify({'error': 'player query parameter is required'}), 400

    print(player_name)
    player_name_encoded = urllib.parse.quote(player_name)
    print(f"Encoded player name: {player_name_encoded}")

    cached_result = mc.get(player_name_encoded)

    if cached_result:
        return cached_result, 200
    else:
        # SQL query with the provided player name
        query = """
        SELECT A.Player as p1, B.Player as p2, C.Player as p3, D.Player as p4
        FROM assists A, assists B, assists C, assists D
        WHERE A.POS = B.POS AND B.POS = C.POS AND C.POS = D.POS
        AND A.Club <> B.Club AND A.Club <> C.Club AND A.Club <> D.Club
        AND B.Club <> C.Club AND B.Club <> D.Club AND C.Club <> D.Club
        AND A.Player = %s
        ORDER BY A.A + B.A + C.A + D.A DESC, A.A DESC, B.A DESC, C.A DESC, D.A DESC, p1, p2, p3, p4
        LIMIT 1;
        """

        # Establish database connection and fetch data
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(query, (player_name,))
            result = cursor.fetchall()
            cursor.close()
            connection.close()

            # Extract players from the query result
            players = []
            if result:
                row = result[0]
                players = [row['p1'], row['p2'], row['p3'], row['p4']]


            # Return the response with the X-CSE356 header
            response = jsonify({'players': players})
            response.headers['X-CSE356'] = '66cfe2a89ba30e1a6c7067ce'  # Replace with your submission ID

            # Cache the result using Memcached
            p_encode = urllib.parse.quote(player_name)
            mc.set(p_encode, players, time=300)
            return response
        else:
            return jsonify({'error': 'Failed to connect to database'}), 500

# Start the Flask server
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=80)
