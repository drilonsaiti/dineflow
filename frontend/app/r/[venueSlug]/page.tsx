export default function VenueWithoutTablePage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-canvas p-8 text-center dark:bg-surface-dark">
            <p className="text-lg font-medium text-ink dark:text-white">Scan the QR code on your table to order.</p>
            <p className="mt-2 text-sm text-muted">This menu is only available per-table.</p>
        </div>
    );
}