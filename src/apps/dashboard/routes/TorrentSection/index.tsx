import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Pause from '@mui/icons-material/Pause';
import Delete from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { useLocation } from 'react-router-dom';

import globalize from 'lib/globalize';
import loading from 'components/loading/loading';

// --- Interfaces based on API responses ---
interface SearchResultItem {
    Id: string;
    Name: string;
    Info_hash: string;
    Leechers: string;
    Seeders: string;
    Num_files: string;
    Size: string;
    Username: string;
    Added: string;
    Status: string;
    Category: string;
    Imdb: string;
}

interface TorrentProgressItem {
    hash: string;
    name: string;
    size: number;
    progress: number;
    state: string;
    dlspeed: number;
    upspeed: number;
    eta: number;
    completed: number;
    downloaded: number;
    uploaded: number;
    ratio: number;
    num_seeds: number;
    num_leechs: number;
    added_on: number;
    content_path: string;
}

interface LibraryInfo {
    Name: string;
    Paths: string[];
}

// --- Utility Functions ---
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDate = (unixTimestamp: string | number): string => {
    if (!unixTimestamp) return '';
    const date = new Date(typeof unixTimestamp === 'string' ? 
        Number(unixTimestamp) * 1000 : 
        unixTimestamp * 1000);
    return date.toLocaleDateString();
};

const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '0 B/s';
    
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let speed = bytesPerSecond;
    let unitIndex = 0;
    
    while (speed >= 1024 && unitIndex < units.length - 1) {
        speed /= 1024;
        unitIndex++;
    }
    
    return `${speed.toFixed(2)} ${units[unitIndex]}`;
};

const formatETA = (seconds: number): string => {
    if (seconds <= 0 || seconds >= 8640000) return 'Unknown';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
};

const generateMagnetLink = (item: SearchResultItem): string => {
    return `magnet:?xt=urn:btih:${item.Info_hash}&dn=${encodeURIComponent(item.Name)}`;
};

// --- Component ---
const TorrentSectionComponent: React.FC = () => {
    const location = useLocation(); 
    const progressUpdateInterval = useRef<NodeJS.Timeout | null>(null);
    
    // Early exit if not on the correct route
    if (location.pathname !== '/dashboard/TorrentSection' && 
        location.pathname !== '/dashboard/TorrentSection/') {
        console.log('TorrentSection not rendering - wrong path:', location.pathname);
        return null;
    }

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
    const [selectedItems, setSelectedItems] = useState<SearchResultItem[]>([]);
    const [isLoadingSearch, setIsLoadingSearch] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    
    // New states for torrent progress
    const [torrentsProgress, setTorrentsProgress] = useState<TorrentProgressItem[]>([]);
    const [isLoadingProgress, setIsLoadingProgress] = useState(false);
    const [progressError, setProgressError] = useState<string | null>(null);
    
    // Library states
    const [libraries, setLibraries] = useState<LibraryInfo[]>([]);
    const [selectedSavePath, setSelectedSavePath] = useState<string>('');
    const [isLoadingLibraries, setIsLoadingLibraries] = useState(false);
    
    // Delete confirmation dialog states
    const [pendingDeleteHash, setPendingDeleteHash] = useState<string | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    // --- Library Fetching ---
    const fetchLibraries = useCallback(async () => {
        try {
            setIsLoadingLibraries(true);
            
            const url = window.ApiClient.getUrl('torrent/libraries');
            const results = await window.ApiClient.getJSON(url);
            setLibraries(results || []);
            
            // Set first available path as default if available
            if (results?.length > 0 && results[0].Paths?.length > 0) {
                setSelectedSavePath(results[0].Paths[0]);
            }
        } catch (error) {
            console.error("Failed to fetch libraries:", error);
            setErrorMessage(`Failed to fetch libraries: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoadingLibraries(false);
        }
    }, []);

    // --- Torrent Progress Fetching ---
    const fetchTorrentProgress = useCallback(async () => {
        try {
            setIsLoadingProgress(true);
            setProgressError(null);
            
            const url = window.ApiClient.getUrl('torrent/progress');
            const results = await window.ApiClient.getJSON(url);
            setTorrentsProgress(results || []);
        } catch (error) {
            console.error("Failed to fetch torrent progress:", error);
            setProgressError(`Progress update failed: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoadingProgress(false);
        }
    }, []);

    // Lifecycle management
    useEffect(() => {
        console.log('TorrentSection mounted');
        
        // Initial fetch of torrent progress and libraries
        fetchTorrentProgress();
        fetchLibraries();
        
        // Set up periodic updates
        progressUpdateInterval.current = setInterval(() => {
            fetchTorrentProgress();
        }, 3000); // Update every 3 seconds
        
        return () => {
            console.log('TorrentSection unmounting');
            // Clear the interval when component unmounts
            if (progressUpdateInterval.current) {
                clearInterval(progressUpdateInterval.current);
            }
        };
    }, [fetchTorrentProgress, fetchLibraries]);

    // --- Search Handler ---
    const handleSearch = useCallback(async () => {
        if (!searchTerm.trim()) return; // Don't search if empty

        console.log('Searching for:', searchTerm);
        setIsLoadingSearch(true);
        setSearchResults([]); // Clear previous results immediately
        setErrorMessage(null); // Clear any previous errors
        loading.show();

        try {
            // Use ApiClient to make the request - this handles authentication automatically
            const url = window.ApiClient.getUrl('torrent/search', {
                q: searchTerm
            });

            const results = await window.ApiClient.getJSON(url);
            setSearchResults(results || []);
        } catch (error) {
            console.error("Search failed:", error);
            setErrorMessage(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoadingSearch(false);
            loading.hide();
        }
    }, [searchTerm]);

    // --- Selection Handler ---
    const handleToggleSelection = useCallback((item: SearchResultItem) => {
        setSelectedItems(prevSelected => {
            const isSelected = prevSelected.some(selected => selected.Id === item.Id);
            if (isSelected) {
                // Remove item
                return prevSelected.filter(selected => selected.Id !== item.Id);
            } else {
                // Add item
                return [...prevSelected, item];
            }
        });
    }, []);

    // --- Download Handler ---
    const handleDownload = useCallback(async () => {
        if (selectedItems.length === 0) return; // Nothing to download
        if (!selectedSavePath) {
            setErrorMessage("Please select a download location");
            return;
        }

        console.log('Downloading selected items to:', selectedSavePath);
        setIsDownloading(true);
        setDownloadProgress(0);
        setErrorMessage(null); // Clear any previous errors
        loading.show();

        try {
            // Download each selected item one by one
            for (const item of selectedItems) {
                const url = window.ApiClient.getUrl('torrent/download');
                await window.ApiClient.ajax({
                    type: 'POST',
                    url: url,
                    data: JSON.stringify({
                        Info_hash: item.Info_hash,
                        Name: item.Name,
                        SavePath: selectedSavePath
                    }),
                    contentType: 'application/json'
                });
            }
            
            // Fetch progress immediately after adding torrents
            fetchTorrentProgress();
            
            // Clear selection after successful download
            setSelectedItems([]);
            
        } catch (error) {
            console.error("Download failed:", error);
            setErrorMessage(`Download failed: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            // Reset progress after a delay or based on actual feedback
            setTimeout(() => {
                setIsDownloading(false);
                setDownloadProgress(0);
                loading.hide();
            }, 1000);
        }
    }, [selectedItems, selectedSavePath, fetchTorrentProgress]);

    // --- Torrent Control Handlers ---
    const handlePauseTorrent = useCallback(async (hash: string) => {
        try {
            const url = window.ApiClient.getUrl('torrent/pause', { hash });
            await window.ApiClient.ajax({
                type: 'POST',
                url: url
            });
            // Refresh the progress data
            fetchTorrentProgress();
        } catch (error) {
            console.error("Failed to pause torrent:", error);
            setProgressError(`Failed to pause torrent: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [fetchTorrentProgress]);

    const handleResumeTorrent = useCallback(async (hash: string) => {
        try {
            const url = window.ApiClient.getUrl('torrent/resume', { hash });
            await window.ApiClient.ajax({
                type: 'POST',
                url: url
            });
            // Refresh the progress data
            fetchTorrentProgress();
        } catch (error) {
            console.error("Failed to resume torrent:", error);
            setProgressError(`Failed to resume torrent: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [fetchTorrentProgress]);
    
    // --- Delete Handlers ---
    const handleDeleteTorrent = useCallback(async (hash: string) => {
        try {
            const url = window.ApiClient.getUrl('torrent/delete', { hash });
            await window.ApiClient.ajax({
                type: 'POST',
                url: url
            });
            // Refresh the progress data
            fetchTorrentProgress();
        } catch (error) {
            console.error("Failed to delete torrent:", error);
            setProgressError(`Failed to delete torrent: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [fetchTorrentProgress]);
    
    const handleDeleteConfirmation = useCallback((hash: string) => {
        setPendingDeleteHash(hash);
        setIsDeleteConfirmOpen(true);
    }, []);

    const handleDeleteCancel = useCallback(() => {
        setPendingDeleteHash(null);
        setIsDeleteConfirmOpen(false);
    }, []);

    const handleDeleteConfirm = useCallback(() => {
        if (pendingDeleteHash) {
            handleDeleteTorrent(pendingDeleteHash);
            setPendingDeleteHash(null);
            setIsDeleteConfirmOpen(false);
        }
    }, [handleDeleteTorrent, pendingDeleteHash]);

    // --- Render ---
    return (
        // Full-coverage container to prevent UI overlap issues
        <div 
        style={{
            position: 'absolute',
            top: 0,
            left: 'var(--sidebar-width, 240px)', 
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--theme-background, #000)', 
            zIndex: 2,  // Lower z-index to prevent input issues
            overflow: 'auto',
            padding: '20px',
            pointerEvents: 'auto', // Ensure pointer events work
        }}
        >
            {/* Jellyfin's standard section header style */}
            <div className="sectionTitleContainer flex align-items-center">
                <h2 className="sectionTitle">{globalize.translate('Torrent')}</h2>
            </div>
            
            {/* Display errors if any */}
            {errorMessage && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {errorMessage}
                </Alert>
            )}
            
            {/* Active Torrents Progress Section */}
            <Typography variant="h6" gutterBottom>
                {globalize.translate('ActiveTorrents')}
            </Typography>
            
            {progressError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {progressError}
                </Alert>
            )}
            
            <Box sx={{ mb: 4 }}>
                {isLoadingProgress && torrentsProgress.length === 0 && (
                    <LinearProgress sx={{ width: '100%', mb: 2 }} />
                )}
                
                {torrentsProgress.length === 0 && !isLoadingProgress && (
                    <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                        <Typography>No active torrents</Typography>
                    </Paper>
                )}
                
                <Grid container spacing={2}>
                    {torrentsProgress.map((torrent) => (
                        <Grid item xs={12} md={6} lg={4} key={torrent.hash}>
                            <Card 
                                variant="outlined" 
                                sx={{ 
                                    height: '100%', 
                                    position: 'relative',
                                    border: '1px solid rgba(255, 255, 255, 0.12)'
                                }}
                            >
                                <CardContent>
                                    <Typography variant="subtitle1" noWrap title={torrent.name} sx={{ mb: 1, fontWeight: 'bold' }}>
                                        {torrent.name}
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <Box sx={{ width: '100%', mr: 1 }}>
                                            <LinearProgress 
                                                variant="determinate" 
                                                value={torrent.progress * 100} 
                                                sx={{ 
                                                    height: 8, 
                                                    borderRadius: 1,
                                                    '& .MuiLinearProgress-bar': {
                                                        bgcolor: torrent.state.includes('DL') ? 'primary.main' : 'success.main'
                                                    }
                                                }}
                                            />
                                        </Box>
                                        <Box sx={{ minWidth: 45 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                {(torrent.progress * 100).toFixed(1)}%
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Grid container spacing={1}>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                Status: <Typography component="span" variant="body2" color="text.primary">
                                                    {torrent.state === 'downloading' ? 'Downloading' :
                                                     torrent.state === 'uploading' ? 'Seeding' :
                                                     torrent.state === 'pausedDL' ? 'Paused' :
                                                     torrent.state === 'stoppedDL' ? 'Stopped' :
                                                     torrent.state}
                                                </Typography>
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                Size: <Typography component="span" variant="body2" color="text.primary">
                                                    {formatFileSize(torrent.size)}
                                                </Typography>
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                Down: <Typography component="span" variant="body2" color="text.primary">
                                                    {formatSpeed(torrent.dlspeed)}
                                                </Typography>
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                Up: <Typography component="span" variant="body2" color="text.primary">
                                                    {formatSpeed(torrent.upspeed)}
                                                </Typography>
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                ETA: <Typography component="span" variant="body2" color="text.primary">
                                                    {formatETA(torrent.eta)}
                                                </Typography>
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                Added: <Typography component="span" variant="body2" color="text.primary">
                                                    {formatDate(torrent.added_on)}
                                                </Typography>
                                            </Typography>
                                        </Grid>
                                    </Grid>

                                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                        {(torrent.state === 'pausedDL' || torrent.state === 'stoppedDL') ? (
                                            <IconButton 
                                                size="small" 
                                                color="primary" 
                                                onClick={() => handleResumeTorrent(torrent.hash)}
                                                title="Resume"
                                            >
                                                <PlayArrow />
                                            </IconButton>
                                        ) : (
                                            <IconButton 
                                                size="small" 
                                                color="primary" 
                                                onClick={() => handlePauseTorrent(torrent.hash)}
                                                title="Pause"
                                            >
                                                <Pause />
                                            </IconButton>
                                        )}
                                        
                                        <IconButton 
                                            size="small" 
                                            color="error"
                                            onClick={() => handleDeleteConfirmation(torrent.hash)}
                                            title="Delete"
                                        >
                                            <Delete />
                                        </IconButton>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            <Divider sx={{ my: 3 }} />
            
            {/* Search Area */}
            <Typography variant="h6" gutterBottom>
                {globalize.translate('SearchTorrents')}
            </Typography>
            
            <Paper elevation={2} sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                    label={globalize.translate('SearchTerm')}
                    variant="outlined"
                    fullWidth
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter') handleSearch(); }}
                    disabled={isLoadingSearch || isDownloading}
                />
                <Button
                    variant="contained"
                    onClick={handleSearch}
                    disabled={isLoadingSearch || isDownloading || !searchTerm.trim()}
                >
                    {globalize.translate('Search')}
                </Button>
            </Paper>

            {/* Results and Selection Area */}
            <Grid container spacing={3}>
                {/* Search Results Column */}
                <Grid item xs={12} md={7}>
                    <Typography variant="h6" gutterBottom>
                        {globalize.translate('SearchResults')}
                        {searchResults.length > 0 && ` (${searchResults.length})`}
                    </Typography>
                    <Paper elevation={1} sx={{ maxHeight: '50vh', overflow: 'auto' }}>
                        {isLoadingSearch && <LinearProgress sx={{ width: '100%' }} />}
                        <List dense>
                            {searchResults.length === 0 && !isLoadingSearch && (
                                <ListItem>
                                    <ListItemText primary={globalize.translate('NoResultsEnterSearch')} />
                                </ListItem>
                            )}
                            {searchResults.map((item) => (
                                <ListItem
                                    key={item.Id}
                                    secondaryAction={
                                        <Checkbox
                                            edge="end"
                                            onChange={() => handleToggleSelection(item)}
                                            checked={selectedItems.some(selected => selected.Id === item.Id)}
                                            disabled={isDownloading}
                                        />
                                    }
                                    disablePadding
                                >
                                    <Box 
                                        sx={{ flexGrow: 1, cursor: 'pointer', p: 1 }} 
                                        onClick={() => handleToggleSelection(item)}
                                    >
                                        <ListItemText
                                            primary={item.Name}
                                            secondary={
                                                <React.Fragment>
                                                    <Typography component="span" variant="body2" color="text.primary">
                                                        {`${Number(item.Seeders).toLocaleString()} seeders • ${Number(item.Leechers).toLocaleString()} leechers`}
                                                    </Typography>
                                                    <br />
                                                    <Typography component="span" variant="body2">
                                                        {`${formatFileSize(Number(item.Size))} • ${formatDate(item.Added)}`}
                                                    </Typography>
                                                    {item.Username && (
                                                        <>
                                                            <br />
                                                            <Typography component="span" variant="body2">
                                                                {`Uploader: ${item.Username}`}
                                                            </Typography>
                                                        </>
                                                    )}
                                                </React.Fragment>
                                            }
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
                        {globalize.translate('SelectedForDownload')}
                        {selectedItems.length > 0 && ` (${selectedItems.length})`}
                    </Typography>
                    <Paper elevation={1} sx={{ maxHeight: '50vh', overflow: 'auto' }}>
                        <List dense>
                            {selectedItems.length === 0 && (
                                <ListItem>
                                    <ListItemText primary={globalize.translate('NoItemsSelected')} />
                                </ListItem>
                            )}
                            {selectedItems.map((item) => (
                                <ListItem key={item.Id}>
                                    <ListItemText 
                                        primary={item.Name} 
                                        secondary={`${formatFileSize(Number(item.Size))}`}
                                    />
                                    <Button 
                                        size="small" 
                                        color="error"
                                        onClick={() => handleToggleSelection(item)}
                                    >
                                        {globalize.translate('Remove')}
                                    </Button>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Download Area */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                {/* Library selection dropdown */}
                <Box sx={{ width: '100%', maxWidth: 500, mb: 2 }}>
                    <FormControl fullWidth variant="outlined">
                        <InputLabel id="download-location-label">Download Location</InputLabel>
                        <Select
                            labelId="download-location-label"
                            value={selectedSavePath}
                            onChange={(e) => setSelectedSavePath(e.target.value as string)}
                            label="Download Location"
                            disabled={isDownloading || isLoadingLibraries || libraries.length === 0}
                        >
                            {libraries.flatMap(lib => 
                                lib.Paths.map(path => (
                                    <MenuItem key={`${lib.Name}-${path}`} value={path}>
                                        {`${lib.Name}: ${path}`}
                                    </MenuItem>
                                ))
                            )}
                        </Select>
                    </FormControl>
                </Box>

                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleDownload}
                    disabled={selectedItems.length === 0 || isDownloading || isLoadingSearch || !selectedSavePath}
                    size="large"
                >
                    {globalize.translate('DownloadSelected')}
                </Button>
                {isDownloading && (
                    <Box sx={{ width: '50%', mt: 1 }}>
                        <LinearProgress variant="indeterminate" />
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 0.5 }}>
                            Adding torrents...
                        </Typography>
                    </Box>
                )}
            </Box>
            
            {/* Delete Confirmation Dialog */}
            <Dialog
                open={isDeleteConfirmOpen}
                onClose={handleDeleteCancel}
            >
                <DialogTitle>Delete Torrent</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this torrent? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteCancel}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error" autoFocus>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

// Export it as 'Component' to match Jellyfin's page pattern
TorrentSectionComponent.displayName = 'TorrentSectionPage';
export { TorrentSectionComponent as Component };