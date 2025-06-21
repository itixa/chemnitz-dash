import dash
from dash import dcc, html
import pandas as pd
import plotly.express as px
from pymongo import MongoClient
from collections import Counter

# Connect to MongoDB (Update with your real MongoDB URI)
client = MongoClient("mongodb://localhost:27017")  # or your actual URI if using cloud
db = client["chemnitz"]                            # your DB name
users_collection = db["users"]                     # your collection

# Fetch favorites from all users
all_users = users_collection.find()
all_favorites = []

for user in all_users:
    if "favorites" in user:
        for site in user["favorites"]:
            all_favorites.append(site["name"])

# Count frequency of each favorite destination
favorite_counts = Counter(all_favorites)

# Convert to DataFrame
df = pd.DataFrame({
    "Destination": list(favorite_counts.keys()),
    "Times Favorited": list(favorite_counts.values())
}).sort_values(by="Times Favorited", ascending=False)

# Initialize Dash app
app = dash.Dash(__name__)
fig = px.line(df, x="Destination", y="Times Favorited", markers=True, title="⭐ Most Favorited Cultural Sites")

app.layout = html.Div(children=[
    html.H1("📊 Real Favorites from MongoDB", style={'textAlign': 'center'}),
    dcc.Graph(figure=fig)
])

if __name__ == "__main__":
    app.run(debug=True)
