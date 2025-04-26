import CloudDownload from '@mui/icons-material/CloudDownload';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import React from 'react';

import ListItemLink from 'components/ListItemLink';
import globalize from 'lib/globalize';

const TorrentSection = () => {
    return (
        <List
            aria-labelledby='mynew-subheader'
            subheader={
                <ListSubheader component='div' id='mynew-subheader'>
                    {globalize.translate('TorrentSection')}
                </ListSubheader>
            }
        >
            <ListItem disablePadding>
                <ListItemLink to='/dashboard/TorrentSection'>
                    <ListItemIcon>
                        <CloudDownload />
                    </ListItemIcon>
                    <ListItemText primary={globalize.translate('TorrentSection')} />
                </ListItemLink>
            </ListItem>
        </List>
    );
};

export default TorrentSection;