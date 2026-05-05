// src/components/CustomDrawer.js
import { styled } from '@mui/material/styles';
import Drawer from '@mui/material/Drawer';

const CustomDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'darkMode'
})(({ darkMode }) => ({
  '& .legend-titles': {
    fontWeight: 'bold',
    color: darkMode ? '#ffffff' : '#1e1e1e',
  },
  '& .components': {
    backgroundColor: darkMode ? '#2a2a3a' : '#f5f5f5',
    padding: '20px',
    height: '100%',
    width: '300px',
  }
}));

export default CustomDrawer;
