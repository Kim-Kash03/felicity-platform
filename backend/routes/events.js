const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Feedback = require('../models/Feedback');
const { protect, authorize } = require('../middleware/authMiddleware');

function computeStatus(event) {
    const stored = event.status;
    // Manual terminal states always take priority
    if (['draft', 'closed', 'completed'].includes(stored)) return stored;
    // If manually marked ongoing, it stays ongoing regardless of dates
    if (stored === 'ongoing') return 'ongoing';

    const now = new Date();
    // Auto-complete if end date passed
    if (now > new Date(event.endDate)) return 'completed';
    // Auto-ongoing if start date passed
    if (now >= new Date(event.startDate)) return 'ongoing';

    return stored; // published
}

// GET /api/events/organizer/my – organizer's own events (MUST be before /:id)
router.get('/organizer/my', protect, authorize('organizer'), async (req, res) => {
    try {
        const events = await Event.find({ organizer: req.user._id }).sort({ createdAt: -1 });
        const result = events.map(e => ({ ...e.toObject(), status: computeStatus(e) }));
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/events – browse with search, filter, trending
router.get('/', async (req, res) => {
    try {
        const { search, type, eligibility, startDate, endDate, followed, trending, page = 1, limit = 20 } = req.query;
        let query = { status: { $in: ['published', 'ongoing'] } };

        if (type) query.type = type;
        if (eligibility) query.eligibility = { $in: [eligibility, 'all'] };
        if (startDate || endDate) {
            query.startDate = {};
            if (startDate) query.startDate.$gte = new Date(startDate);
            if (endDate) query.startDate.$lte = new Date(endDate);
        }
        if (search) {
            query.$text = { $search: search };
        }

        // Followed clubs filter (requires auth token in query)
        if (followed && req.query.userId) {
            const user = await User.findById(req.query.userId);
            if (user && user.followedOrganizers.length > 0) {
                query.organizer = { $in: user.followedOrganizers };
            }
        }

        let eventsQuery = Event.find(query)
            .populate('organizer', 'organizerName category')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const events = await eventsQuery;
        const total = await Event.countDocuments(query);

        // Trending: top 5 by views in last 24h
        if (trending === 'true') {
            const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const allEvents = await Event.aggregate([
                { $match: { status: { $in: ['published', 'ongoing'] } } },
                {
                    $project: {
                        name: 1, type: 1, startDate: 1, endDate: 1, organizer: 1,
                        registrationDeadline: 1, registrationFee: 1, tags: 1, status: 1,
                        recentViewCount: {
                            $size: {
                                $filter: {
                                    input: { $ifNull: ['$recentViews', []] },
                                    cond: { $gte: ['$$this', since] }
                                }
                            }
                        }
                    }
                },
                { $sort: { recentViewCount: -1 } },
                { $limit: 5 }
            ]);
            return res.json({ trending: allEvents, events, total });
        }

        const withStatus = events.map(e => ({ ...e.toObject(), status: computeStatus(e) }));
        res.json({ events: withStatus, total, page: parseInt(page) });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/events/:id – event details
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('organizer', 'organizerName category description contactEmail');
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Track view for trending
        event.viewCount += 1;
        event.recentViews = event.recentViews || [];
        event.recentViews.push(new Date());
        // Keep only last 1000 views to prevent unbounded growth
        if (event.recentViews.length > 1000) event.recentViews = event.recentViews.slice(-1000);
        await event.save();

        // Return with computed live status
        const eventObj = event.toObject();
        eventObj.status = computeStatus(event);
        res.json(eventObj);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST /api/events – create event (organizer only)
router.post('/', protect, authorize('organizer'), async (req, res) => {
    try {
        const {
            name, description, type, eligibility, registrationDeadline,
            startDate, endDate, registrationLimit, registrationFee, tags,
            customForm, variants, purchaseLimitPerParticipant, totalStock,
            isTeamEvent, teamSizeMin, teamSizeMax
        } = req.body;

        const event = new Event({
            name, description, type,
            eligibility: eligibility || 'all',
            registrationDeadline: new Date(registrationDeadline),
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            registrationLimit: registrationLimit || 0,
            registrationFee: registrationFee || 0,
            tags: tags || [],
            organizer: req.user._id,
            status: 'draft',
            customForm: type === 'normal' ? (customForm || []) : [],
            variants: type === 'merchandise' ? (variants || []) : [],
            purchaseLimitPerParticipant: purchaseLimitPerParticipant || 1,
            totalStock: totalStock || 0,
            isTeamEvent: isTeamEvent || false,
            teamSizeMin: teamSizeMin || 2,
            teamSizeMax: teamSizeMax || 4,
        });
        await event.save();

        // Discord webhook
        if (req.user.discordWebhook) {
            try {
                const { default: fetch } = await import('node-fetch');
                await fetch(req.user.discordWebhook, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: ` New event created: **${name}** (${type}) — Status: Draft`,
                    }),
                });
            } catch (_) { }
        }

        res.status(201).json(event);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PUT /api/events/:id – update event (organizer only, with editing rules)
router.put('/:id', protect, authorize('organizer'), async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const originalStoredStatus = event.status;
        if (originalStoredStatus === 'draft') {
            // Free edits + allow publish
            const allowed = ['name', 'description', 'type', 'eligibility', 'registrationDeadline',
                'startDate', 'endDate', 'registrationLimit', 'registrationFee', 'tags',
                'customForm', 'variants', 'purchaseLimitPerParticipant', 'totalStock', 'status', 'isTeamEvent', 'teamSizeMin', 'teamSizeMax'];
            allowed.forEach(f => { if (req.body[f] !== undefined) event[f] = req.body[f]; });

            // Lock form if being published and form exists
            if (req.body.status === 'published') {
                // Post Discord webhook for new events
                if (req.user.discordWebhook) {
                    try {
                        const { default: fetch } = await import('node-fetch');
                        await fetch(req.user.discordWebhook, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                content: ` @everyone **Event Published: ${event.name}**\nType: ${event.type} | Deadline: ${event.registrationDeadline.toLocaleDateString()}`,
                            }),
                        });
                    } catch (_) { }
                }
            }
        } else if (originalStoredStatus === 'published' || originalStoredStatus === 'ongoing' || originalStoredStatus === 'completed' || originalStoredStatus === 'closed') {
            // Edits allowed in active/terminal states
            if (req.body.description) event.description = req.body.description;
            if (req.body.tags) event.tags = req.body.tags;

            // Extend deadline or increase limit (published/ongoing only)
            if (originalStoredStatus === 'published' || originalStoredStatus === 'ongoing') {
                if (req.body.registrationDeadline && new Date(req.body.registrationDeadline) > event.registrationDeadline)
                    event.registrationDeadline = new Date(req.body.registrationDeadline);
                if (req.body.registrationLimit && req.body.registrationLimit > event.registrationLimit)
                    event.registrationLimit = req.body.registrationLimit;
            }

            // Status overrides
            if (req.body.status && ['published', 'ongoing', 'completed', 'closed'].includes(req.body.status)) {
                // If moving from draft to published, trigger webhook (covered in draft block)
                event.status = req.body.status;
            }

            // Form update only if not locked
            if (!event.formLocked && req.body.customForm) event.customForm = req.body.customForm;
        } else {
            return res.status(400).json({ message: 'Event cannot be edited in its current status' });
        }

        await event.save();

        const result = event.toObject();
        result.status = computeStatus(event);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/events/:id/feedback/status – check if participant submitted feedback
router.get('/:id/feedback/status', protect, authorize('participant'), async (req, res) => {
    try {
        const existingFeedback = await Feedback.findOne({
            event: req.params.id,
            user: req.user._id
        });
        res.json({ submitted: !!existingFeedback });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST /api/events/:id/feedback – submit anonymous feedback (participant only)
router.post('/:id/feedback', protect, authorize('participant'), async (req, res) => {
    try {
        const { rating, comment } = req.body;
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Valid rating between 1 and 5 is required' });
        }

        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const status = computeStatus(event);
        // Participant must have registered and attended the event
        const registration = await Registration.findOne({
            event: req.params.id,
            participant: req.user._id
        });

        if (!registration) {
            return res.status(403).json({ message: 'You must be registered for this event to leave feedback' });
        }

        if (registration.status !== 'attended' && status !== 'completed') {
            return res.status(403).json({ message: 'You can only leave feedback after attending the event or after the event has completed' });
        }

        // Check for existing feedback
        const existingFeedback = await Feedback.findOne({
            event: req.params.id,
            user: req.user._id
        });

        if (existingFeedback) {
            return res.status(400).json({ message: 'You have already submitted feedback for this event' });
        }

        const feedback = new Feedback({
            event: req.params.id,
            user: req.user._id,
            rating,
            comment
        });

        await feedback.save();

        res.status(201).json({ message: 'Feedback submitted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/events/:id/feedback – view anonymous feedback (organizer only)
router.get('/:id/feedback', protect, authorize('organizer'), async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Ensure the requester is the event organizer
        if (event.organizer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view feedback for this event' });
        }

        const { rating } = req.query;
        let query = { event: req.params.id };
        if (rating) {
            query.rating = Number(rating);
        }

        // Exclude the 'user' field entirely to maintain anonymity
        const feedbacks = await Feedback.find(query)
            .select('-user')
            .sort({ createdAt: -1 });

        // Calculate analytics only when sending all ratings
        let analytics = null;
        if (!rating) {
            const allFeedbacks = feedbacks;
            const total = allFeedbacks.length;
            const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            let sum = 0;

            allFeedbacks.forEach(f => {
                ratingCounts[f.rating]++;
                sum += f.rating;
            });

            analytics = {
                average: total > 0 ? (sum / total).toFixed(1) : 0,
                total,
                ratingCounts
            };
        }

        res.json({ feedbacks, analytics });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
