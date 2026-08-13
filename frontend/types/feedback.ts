export type FeedbackSummary = {
    avgRating: number | null;
    totalRatings: number;
    recent: {
        orderNumber: number;
        rating: number;
        comment: string | null;
        createdAt: string;
    }[];
};