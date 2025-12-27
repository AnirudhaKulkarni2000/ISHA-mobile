import {
    createMeasurement,
    getAllMeasurements,
    getLatestMeasurement,
    getMeasurementById,
    updateMeasurement,
    deleteMeasurement,
} from '../models/bodyMeasurementsModel.js';

// Create a new measurement entry
export const create = async (req, res) => {
    try {
        const measurement = await createMeasurement(req.body);
        res.status(201).json({
            success: true,
            message: 'Body measurements saved successfully',
            data: measurement,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error saving body measurements',
            error: error.message,
        });
    }
};

// Get all measurement entries (history)
export const getAll = async (req, res) => {
    try {
        const measurements = await getAllMeasurements();
        res.status(200).json({
            success: true,
            data: measurements,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching measurements history',
            error: error.message,
        });
    }
};

// Get the latest measurement
export const getLatest = async (req, res) => {
    try {
        const measurement = await getLatestMeasurement();
        res.status(200).json({
            success: true,
            data: measurement || null,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching latest measurements',
            error: error.message,
        });
    }
};

// Get measurement by ID
export const getById = async (req, res) => {
    try {
        const { id } = req.params;
        const measurement = await getMeasurementById(id);

        if (!measurement) {
            return res.status(404).json({
                success: false,
                message: 'Measurement not found',
            });
        }

        res.status(200).json({
            success: true,
            data: measurement,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching measurement',
            error: error.message,
        });
    }
};

// Update measurement entry
export const update = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('📝 Updating measurement ID:', id);
        console.log('📦 Update data:', JSON.stringify(req.body, null, 2));
        
        const measurement = await updateMeasurement(id, req.body);

        if (!measurement) {
            return res.status(404).json({
                success: false,
                message: 'Measurement not found',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Measurements updated successfully',
            data: measurement,
        });
    } catch (error) {
        console.error('❌ Update measurement error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating measurements',
            error: error.message,
        });
    }
};

// Delete measurement entry
export const remove = async (req, res) => {
    try {
        const { id } = req.params;
        const measurement = await deleteMeasurement(id);

        if (!measurement) {
            return res.status(404).json({
                success: false,
                message: 'Measurement not found',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Measurement deleted successfully',
            data: measurement,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting measurement',
            error: error.message,
        });
    }
};
