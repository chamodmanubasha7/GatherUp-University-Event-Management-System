import Announcement from '../models/Announcement.js';

export const getAnnouncements = async (req, res) => {
  try {
    const { category, priority, page = 1, limit = 10 } = req.query;
    
    const filter = { 
      isActive: true,
      $or: [
        { expiryDate: { $exists: false } },
        { expiryDate: { $gt: new Date() } }
      ]
    };
    
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'name email')
      .sort({ priority: -1, publishDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Announcement.countDocuments(filter);

    res.json({
      announcements,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAnnouncementById = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!announcement || !announcement.isActive) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    if (announcement.expiryDate && announcement.expiryDate < new Date()) {
      return res.status(404).json({ message: 'Announcement has expired' });
    }

    res.json(announcement);
  } catch (error) {
    console.error('Get announcement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createAnnouncement = async (req, res) => {
  try {
    const announcementData = {
      ...req.body,
      createdBy: req.user.id
    };

    const announcement = new Announcement(announcementData);
    await announcement.save();

    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Announcement created successfully',
      announcement: populatedAnnouncement
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    Object.assign(announcement, req.body);
    await announcement.save();

    const updatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('createdBy', 'name email');

    res.json({
      message: 'Announcement updated successfully',
      announcement: updatedAnnouncement
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    announcement.isActive = false;
    await announcement.save();

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAnnouncementStats = async (req, res) => {
  try {
    const stats = await Announcement.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityStats = await Announcement.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      categoryStats: stats,
      priorityStats
    });
  } catch (error) {
    console.error('Get announcement stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
