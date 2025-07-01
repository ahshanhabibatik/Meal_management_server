const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5004;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tqyfr7x.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// MongoDB client setup
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        // MongoDB Collections
        const userCollection = client.db('MealDB2025').collection('users');
        const mealCollection = client.db('MealDB2025').collection('meals');
        const bazarCollection = client.db('MealDB2025').collection('bazar');
        const routineCollection = client.db('MealDB2025').collection('routine');
        const amountCollection = client.db('MealDB2025').collection('amount');
        const varaCollection = client.db('MealDB2025').collection('vasaBara');
        const rentCollection = client.db('MealDB2025').collection('homeRent');
        const khalaCollection = client.db('MealDB2025').collection('khalaBill');
        const currentCollection = client.db('MealDB2025').collection('currentBill');
        const noticeCollection = client.db('MealDB2025').collection('notice');

        // JWT related API
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1y' });
            res.send({ token });
        });

        // Middleware to verify JWT token
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'Unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'Unauthorized access' });
                }
                req.decoded = decoded;
                next();
            });
        };

        // Verify admin role
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'Forbidden access' });
            }
            next();
        };

        // Check if user is admin
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        });

        // Users related API
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });
        // Users related API
        app.get('/users2', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exists', insertedId: null });
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        // Meal Insert API with Duplicate Check
        app.post('/meals', async (req, res) => {
            try {
                const { meals, date } = req.body;
                const { day, month, year } = date;

                // Check if meal already exists
                const existingMeal = await mealCollection.findOne({ "date.day": day, "date.month": month, "date.year": year });

                if (existingMeal) {
                    return res.status(400).json({ success: false, message: "This date meal is already inserted!" });
                }

                // Insert new meal
                const newMeal = {
                    meals,
                    date,
                };

                const result = await mealCollection.insertOne(newMeal);
                res.json({ success: true, message: "Meal data submitted successfully!", insertedId: result.insertedId });

            } catch (error) {
                console.error(error);
                res.status(500).json({ success: false, message: "Server Error" });
            }
        });


        app.patch('/users/:id', async (req, res) => {
            const id = req.params.id;
            const updateDoc = {
                $set: req.body,
            };
            const result = await userCollection.updateOne({ _id: new ObjectId(id) }, updateDoc);
            res.send(result);
        });


        // Get Meals API
        app.get('/meals', async (req, res) => {
            const result = await mealCollection.find().toArray();
            res.send(result);
        });

        app.get('/meals/:id', async (req, res) => {
            const id = req.params.id;
            try {
                const meal = await mealCollection.findOne({ _id: new ObjectId(id) });
                if (!meal) return res.status(404).send({ message: "Meal not found" });
                res.send(meal);
            } catch (error) {
                res.status(500).send({ message: "Error fetching meal" });
            }
        });

        app.get('/meals2', async (req, res) => {
            const result = await mealCollection.find().toArray();
            res.send(result);
        });

        app.delete('/meals/:id', async (req, res) => {
            const mealId = req.params.id;

            try {
                const result = await mealCollection.deleteOne({ _id: new ObjectId(mealId) });

                if (result.deletedCount === 1) {
                    res.status(200).send({ message: 'Meal deleted successfully.' });
                } else {
                    res.status(404).send({ message: 'Meal not found.' });
                }
            } catch (error) {
                console.error('Error deleting meal:', error);
                res.status(500).send({ message: 'Server error while deleting the meal.' });
            }
        });

        app.delete('/meals2/delete-by-month', async (req, res) => {
            try {
                const { year, month } = req.query;

                if (!year || !month) {
                    return res.status(400).send({ message: "Year and month are required." });
                }

                const numericYear = parseInt(year);
                const numericMonth = parseInt(month);

                const result = await mealCollection.deleteMany({
                    "date.year": numericYear,
                    "date.month": numericMonth
                });

                res.send({
                    deletedCount: result.deletedCount,
                    message: `Deleted ${result.deletedCount} meals for ${year}-${month}`
                });
            } catch (error) {
                console.error("Error deleting meals by month:", error);
                res.status(500).send({ message: "Failed to delete meals." });
            }
        });

        app.put('/meals/:id', async (req, res) => {
            const id = req.params.id;
            const updated = { ...req.body };

            // Remove _id field from updated data to avoid immutable field update error
            delete updated._id;

            try {
                const result = await mealCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updated }
                );
                res.send(result);
            } catch (error) {
                console.error('Error updating meal:', error);
                res.status(500).send({ error: 'Failed to update meal' });
            }
        });





        app.post('/bazar', async (req, res) => {
            const jobInfo = req.body;
            try {
                const result = await bazarCollection.insertOne(jobInfo);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to create job event" });
            }
        });

        // Get Bazar data by user email
        app.get('/bazar/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            try {
                const bazars = await bazarCollection.find(query).toArray();
                res.send(bazars);
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch bazar data" });
            }
        });

        app.get('/bazar', async (req, res) => {
            const result = await bazarCollection.find().toArray();
            res.send(result);
        });


        app.delete('/bazar/:id', async (req, res) => {
            const { id } = req.params;

            try {
                const result = await bazarCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: 'Bazar not found' });
                }

                res.send({ message: 'Bazar deleted successfully' });
            } catch (error) {
                console.error("Error deleting job event:", error);
                res.status(500).send({ message: 'Failed to delete job event' });
            }
        });

        app.delete('/users/:id', async (req, res) => {
            const { id } = req.params;

            try {
                const result = await userCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: 'Bazar not found' });
                }

                res.send({ message: 'Bazar deleted successfully' });
            } catch (error) {
                console.error("Error deleting job event:", error);
                res.status(500).send({ message: 'Failed to delete job event' });
            }
        });

        app.post('/routine', async (req, res) => {
            const jobInfo = req.body;
            try {
                // Check if the user already has a routine
                const existingRoutine = await routineCollection.findOne({ username: jobInfo.username });

                if (existingRoutine) {
                    // If routine exists, return a message
                    return res.status(400).send({ message: "User routine is already created" });
                }

                // Insert new routine if not already created
                const result = await routineCollection.insertOne(jobInfo);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to create job event" });
            }
        });

        // 🔹 Get All Routines (Admin View)
        app.get("/routine", async (_, res) => {
            try {
                const routines = await routineCollection.find().toArray();
                res.status(200).json(routines);
            } catch (error) {
                console.error("Error fetching routines:", error);
                res.status(500).json({ message: "Internal Server Error" });
            }
        });

        app.delete('/routine/:id', async (req, res) => {
            const { id } = req.params;

            try {
                // Ensure ObjectId is used properly in query
                const result = await routineCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: 'Bazar not found' });
                }

                // Send success message on successful deletion
                res.send({ message: 'Bazar deleted successfully' });
            } catch (error) {
                console.error("Error deleting job event:", error);
                res.status(500).send({ message: 'Failed to delete job event' });
            }
        });

        app.post('/amount', async (req, res) => {
            const jobInfo = req.body;
            try {
                const result = await amountCollection.insertOne(jobInfo);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to create job event" });
            }
        });

        app.get('/amount', async (req, res) => {
            const result = await amountCollection.find().toArray();
            res.send(result);
        });

        app.delete('/amount/:id', async (req, res) => {
            const { id } = req.params;

            try {
                // Ensure ObjectId is used properly in query
                const result = await amountCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: 'Bazar not found' });
                }

                // Send success message on successful deletion
                res.send({ message: 'Bazar deleted successfully' });
            } catch (error) {
                console.error("Error deleting job event:", error);
                res.status(500).send({ message: 'Failed to delete job event' });
            }
        });

        // POST route to add room rent info
        app.post('/basaBara', async (req, res) => {
            const jobInfo = req.body;
            try {
                const exists = await varaCollection.findOne({
                    userId: jobInfo.userId,
                });

                if (exists) {
                    return res.status(400).send({ alreadyExists: true, message: "Already submitted for this month" });
                }

                const result = await varaCollection.insertOne(jobInfo);
                res.send(result);
            } catch (error) {
                console.error('Error inserting:', error);
                res.status(500).send({ message: "Failed to create job event" });
            }
        });


        app.get("/basaBara", async (req, res) => {
            try {
                const result = await varaCollection.find().toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch rent data" });
            }
        });

        app.delete('/basaBara/:id', async (req, res) => {
            const { id } = req.params;

            try {
                // Ensure ObjectId is used properly in query
                const result = await varaCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: 'Bazar not found' });
                }

                // Send success message on successful deletion
                res.send({ message: 'Bazar deleted successfully' });
            } catch (error) {
                console.error("Error deleting job event:", error);
                res.status(500).send({ message: 'Failed to delete job event' });
            }
        });

        app.get("/rentAmount", async (req, res) => {
            try {
                const result = await varaCollection.find().toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch rent data" });
            }
        });

        app.post('/room-rents', async (req, res) => {
            const { username, month } = req.body;

            const exists = await rentCollection.findOne({ username, month });

            if (exists) {
                return res.status(409).send({ message: 'This user already paid home rent for this month.' });
            }

            const result = await rentCollection.insertOne(req.body);
            res.send(result);
        });



        app.get('/room-rents', async (req, res) => {
            const rents = await rentCollection.find().toArray();
            res.send(rents);
        });


        // Route for deleting room rent by ID
        app.delete('/room-rents/:id', async (req, res) => {
            const id = req.params.id;

            try {
                const result = await rentCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 1) {
                    res.status(200).json({ message: 'Room rent record deleted successfully' });
                } else {
                    res.status(404).json({ message: 'Room rent record not found' });
                }
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: 'Server error, failed to delete' });
            }
        });


        app.post('/khala-bills', async (req, res) => {
            const { username, month } = req.body;

            const exists = await khalaCollection.findOne({ username, month });

            if (exists) {
                return res.status(409).send({ message: 'This user already paid home rent for this month.' });
            }

            const result = await khalaCollection.insertOne(req.body);
            res.send(result);
        });


        app.get('/khala-bills', async (req, res) => {
            const rents = await khalaCollection.find().toArray();
            res.send(rents);
        });


        // Route for deleting room rent by ID
        app.delete('/khala-bills/:id', async (req, res) => {
            const id = req.params.id;

            try {
                const result = await khalaCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 1) {
                    res.status(200).json({ message: 'Room rent record deleted successfully' });
                } else {
                    res.status(404).json({ message: 'Room rent record not found' });
                }
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: 'Server error, failed to delete' });
            }
        });

        app.post('/current-bills', async (req, res) => {
            const { username, month } = req.body;

            const exists = await currentCollection.findOne({ username, month });

            if (exists) {
                return res.status(409).send({ message: 'This user already paid home rent for this month.' });
            }

            const result = await currentCollection.insertOne(req.body);
            res.send(result);
        });


        app.get('/current-bills', async (req, res) => {
            const rents = await currentCollection.find().toArray();
            res.send(rents);
        });


        // Route for deleting room rent by ID
        app.delete('/current-bills/:id', async (req, res) => {
            const id = req.params.id;

            try {
                const result = await currentCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 1) {
                    res.status(200).json({ message: 'Room rent record deleted successfully' });
                } else {
                    res.status(404).json({ message: 'Room rent record not found' });
                }
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: 'Server error, failed to delete' });
            }
        });

        app.post('/notices', async (req, res) => {
            const notice = req.body;
            try {
                const result = await noticeCollection.insertOne(notice);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to create job event" });
            }
        });

        app.get('/notices', async (req, res) => {
            const rents = await noticeCollection.find().toArray();
            res.send(rents);
        });

        app.delete('/notices/:id', async (req, res) => {
            const id = req.params.id;

            try {
                const result = await noticeCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 1) {
                    res.status(200).json({ message: 'Room rent record deleted successfully' });
                } else {
                    res.status(404).json({ message: 'Room rent record not found' });
                }
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: 'Server error, failed to delete' });
            }
        });


        // console.log('Connected to MongoDB!');
    } finally {
        // Uncomment if you want to close the client connection after operation
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('MealDB is running');
});

app.listen(port, () => {
    console.log(`MealDB is running on port ${port}`);
});
