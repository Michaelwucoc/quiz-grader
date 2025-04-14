import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Paper, Container, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid } from '@mui/material';
import { CloudUpload, Print, Settings } from '@mui/icons-material';

const Home = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [openSettings, setOpenSettings] = useState(false);
  const [settings, setSettings] = useState({
    apiEndpoint: 'http://localhost:3000/api/upload',
    model: 'gpt-4-vision-preview'
  });

  const onDrop = useCallback(async (acceptedFiles) => {
    setLoading(true);
    const newFiles = acceptedFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file)
    }));
    setFiles(newFiles);

    try {
      const uploadPromises = newFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('model', settings.model);

        const response = await fetch(settings.apiEndpoint, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('上传失败');
        return await response.json();
      });

      const newResults = await Promise.all(uploadPromises);
      setResults(prev => [...prev, ...newResults]);
    } catch (error) {
      console.error('上传或处理失败:', error);
      alert('文件处理失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [settings]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf']
    }
  });

  return (
    <Container maxWidth="md" sx={{ py: 4, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          startIcon={<Settings />}
          onClick={() => setOpenSettings(true)}
          variant="outlined"
        >
          配置
        </Button>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <Paper
          {...getRootProps()}
          sx={{
            p: 4,
            textAlign: 'center',
            cursor: 'pointer',
            bgcolor: isDragActive ? 'action.hover' : 'background.paper',
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.300',
            width: '100%',
            maxWidth: 500,
            mx: 'auto'
          }}
        >
          <input {...getInputProps()} />
          <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            拖拽文件到此处或点击上传
          </Typography>
          <Typography variant="body2" color="textSecondary">
            支持 JPG、PNG 图片和 PDF 文件
          </Typography>
        </Paper>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      <Box sx={{ mt: 4, display: 'grid', gap: 2 }}>
        {results.map((result, index) => (
          <Paper key={index} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" color="primary">
                总分: {result.result.score}
              </Typography>
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={() => {
                    setCurrentResult(result);
                    setOpenDialog(true);
                  }}
                >
                  查看报告
                </Button>
              </Box>
            </Box>
            
            <Typography variant="body1" paragraph>
              {result.result.feedback}
            </Typography>

            {files[index]?.type.startsWith('image/') && (
              <Box
                component="img"
                src={files[index].preview}
                sx={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: 400,
                  objectFit: 'contain'
                }}
                alt={files[index].name}
              />
            )}
          </Paper>
        ))}
      </Box>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>评分报告</DialogTitle>
        <DialogContent>
          {currentResult && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h4" gutterBottom>
                总分: {currentResult.result.score}
              </Typography>
              <Typography variant="h6" gutterBottom>
                总体评价
              </Typography>
              <Typography paragraph>
                {currentResult.result.feedback}
              </Typography>
              {currentResult.result.details?.map((detail, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" color="primary">
                    问题 {detail.question}: {detail.score} 分
                  </Typography>
                  <Typography>
                    {detail.comment}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>关闭</Button>
          <Button
            onClick={() => window.print()}
            variant="contained"
            startIcon={<Print />}
          >
            打印报告
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openSettings}
        onClose={() => setOpenSettings(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>系统配置</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="API 地址"
                value={settings.apiEndpoint}
                onChange={(e) => setSettings(prev => ({ ...prev, apiEndpoint: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="OpenAI 模型"
                value={settings.model}
                onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSettings(false)}>取消</Button>
          <Button onClick={() => setOpenSettings(false)} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Home;