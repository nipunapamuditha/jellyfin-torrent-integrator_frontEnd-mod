import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid'; // For layout

import globalize from 'lib/globalize';

// --- Interfaces (Define based on your actual API response) ---
interface SearchResultItem {
    id: string; // Unique identifier for the search result
    name: string;
    // Add other relevant details like size, seeds, peers, magnet link, etc.
    magnetLink?: string;
}

// --- Component ---
const TorrentSectionComponent: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
    const [selectedItems, setSelectedItems] = useState<SearchResultItem[]>([]);
    const [isLoadingSearch, setIsLoadingSearch] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    // --- Search Handler ---
    const handleSearch = useCallback(async () => {
        if (!searchTerm.trim()) return; // Don't search if empty

        console.log('Searching for:', searchTerm);
        setIsLoadingSearch(true);
        setSearchResults([]); // Clear previous results immediately

        // TODO: Replace with actual API call to your torrent search provider
        try {
            // const results = await yourTorrentSearchApi.search(searchTerm);
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            const results: SearchResultItem[] = [
                { id: `${searchTerm}-${Date.now()}-1`, name: `${searchTerm} - Result 1 (${Math.floor(Math.random() * 100)} seeds)`, magnetLink: 'magnet:?xt=urn:btih:examplehash1' },
                { id: `${searchTerm}-${Date.now()}-2`, name: `${searchTerm} - Result 2 (${Math.floor(Math.random() * 50)} seeds)`, magnetLink: 'magnet:?xt=urn:btih:examplehash2' },
                { id: `${searchTerm}-${Date.now()}-3`, name: `${searchTerm} - Result 3 (No Magnet Link)` },
            ];
            setSearchResults(results);
        } catch (error) {
            console.error("Search failed:", error);
            // TODO: Show error message to user
        } finally {
            setIsLoadingSearch(false);
        }
    }, [searchTerm]);

    // --- Selection Handler ---
    const handleToggleSelection = useCallback((item: SearchResultItem) => {
        setSelectedItems(prevSelected => {
            const isSelected = prevSelected.some(selected => selected.id === item.id);
            if (isSelected) {
                // Remove item
                return prevSelected.filter(selected => selected.id !== item.id);
            } else {
                // Add item
                return [...prevSelected, item];
            }
        });
    }, []);

    // --- Download Handler ---
    const handleDownload = useCallback(async () => {
        if (selectedItems.length === 0) return; // Nothing to download

        console.log('Downloading selected items:', selectedItems);
        setIsDownloading(true);
        setDownloadProgress(0);

        // TODO: Replace with actual API call(s) to your download client
        // You might need to send magnet links or other identifiers
        try {
            // await yourDownloadClientApi.addTorrents(selectedItems.map(item => item.magnetLink)); // Example
            // Simulate download progress
            for (let progress = 0; progress <= 100; progress += 10) {
                await new Promise(resolve => setTimeout(resolve, 200));
                setDownloadProgress(progress);
            }
            console.log('Download simulation complete.');
            // Optionally clear selection after download starts/completes
            // setSelectedItems([]);
        } catch (error) {
            console.error("Download failed:", error);
            // TODO: Show error message to user
        } finally {
            // Reset progress after a delay or based on actual feedback
            setTimeout(() => {
                setIsDownloading(false);
                setDownloadProgress(0);
            }, 1000);
        }
    }, [selectedItems]);

    // --- Render ---
    return (
        <Box sx={{ p: 3 }}> {/* Add padding around the whole section */}
            <Typography variant="h4" gutterBottom>
                {globalize.translate('TorrentSearch')} {/* Add translation */}
            </Typography>

            {/* Search Area */}
            <Paper elevation={2} sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                    label={globalize.translate('SearchTorrents')}
                    variant="outlined"
                    fullWidth
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter') handleSearch(); }} // Allow Enter key search
                    disabled={isLoadingSearch || isDownloading}
                />
                <Button
                    variant="contained"
                    onClick={handleSearch}
                    disabled={isLoadingSearch || isDownloading || !searchTerm.trim()}
                >
                    {globalize.translate('Search')} {/* Add translation */}
                </Button>
            </Paper>

            {/* Results and Selection Area */}
            <Grid container spacing={3}>
                {/* Search Results Column */}
                <Grid item xs={12} md={7}>
                    <Typography variant="h6" gutterBottom>
                        {globalize.translate('SearchResults')} {/* Add translation */}
                    </Typography>
                    <Paper elevation={1} sx={{ maxHeight: '40vh', overflow: 'auto' }}> {/* Scrollable list */}
                        {isLoadingSearch && <LinearProgress sx={{ width: '100%' }} />}
                        <List dense> {/* dense for smaller items */}
                            {searchResults.length === 0 && !isLoadingSearch && (
                                <ListItem>
                                    <ListItemText primary={globalize.translate('NoResultsEnterSearch')} /> {/* Add translation */}
                                </ListItem>
                            )}
                            {searchResults.map((item) => (
                                <ListItem
                                    key={item.id}
                                    secondaryAction={
                                        <Checkbox
                                            edge="end"
                                            onChange={() => handleToggleSelection(item)}
                                            checked={selectedItems.some(selected => selected.id === item.id)}
                                            disabled={isDownloading} // Disable checkbox while downloading
                                        />
                                    }
                                    disablePadding
                                >
                                    {/* Make the text area clickable for selection too */}
                                    <Box sx={{ flexGrow: 1, cursor: 'pointer', p: 1 }} onClick={() => handleToggleSelection(item)}>
                                        <ListItemText
                                            primary={item.name}
                                            // secondary={ `Size: ${item.size} | Seeds: ${item.seeds}` } // Example secondary text
                                        />
                                    </Box>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>

                {/* Selected Items Column */}
                <Grid item xs={12} md={5}>
                    <Typography variant="h6" gutterBottom>
                        {globalize.translate('SelectedForDownload')} {/* Add translation */}
                    </Typography>
                    <Paper elevation={1} sx={{ maxHeight: '40vh', overflow: 'auto' }}> {/* Scrollable list */}
                        <List dense>
                            {selectedItems.length === 0 && (
                                <ListItem>
                                    <ListItemText primary={globalize.translate('NoItemsSelected')} /> {/* Add translation */}
                                </ListItem>
                            )}
                            {selectedItems.map((item) => (
                                <ListItem key={item.id}>
                                    <ListItemText primary={item.name} />
                                    {/* Optionally add a remove button here */}
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Download Area */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleDownload}
                    disabled={selectedItems.length === 0 || isDownloading || isLoadingSearch}
                    size="large"
                >
                    {globalize.translate('DownloadSelected')} {/* Add translation */}
                </Button>
                {isDownloading && (
                    <Box sx={{ width: '50%', mt: 1 }}> {/* Limit progress bar width */}
                        <LinearProgress variant="determinate" value={downloadProgress} />
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 0.5 }}>
                            {`${Math.round(downloadProgress)}%`}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

// Export it as 'Component' to match the pattern
TorrentSectionComponent.displayName = 'TorrentSectionPage';
export { TorrentSectionComponent as Component };