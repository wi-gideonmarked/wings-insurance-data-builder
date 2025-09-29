import { useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import {
  AppBar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import { Add, Delete, Edit, Save, Tag } from '@mui/icons-material'
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TableSortLabel } from '@mui/material'

type StructureItem = {
  hash: string
  labelMake: string
  labelModel: string
  oraeroModel: string
  oraeroMake: string
  iatMake: string
  iatModel: string
  rokstoneMake: string
  rokstoneModel: string
  sfMake: string
  sfModel: string
  year: number
}

const itemSchema = z.object({
  hash: z.string().optional().default(''), // Hash will be auto-generated for new items
  labelMake: z.string().optional().default(''),
  labelModel: z.string().optional().default(''),
  oraeroModel: z.string().optional().default(''),
  oraeroMake: z.string().optional().default(''),
  iatMake: z.string().optional().default(''),
  iatModel: z.string().optional().default(''),
  rokstoneMake: z.string().optional().default(''),
  rokstoneModel: z.string().optional().default(''),
  sfMake: z.string().optional().default(''),
  sfModel: z.string().optional().default(''),
  year: z.coerce.number().int().min(1900).max(2100),
})

// Hash code generator function
const hashCode = (s: string): string => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0).toString()

const theme = createTheme({
  palette: {
    primary: {
      main: '#800020', // Maroon
      light: '#a00030',
      dark: '#600010',
    },
    secondary: {
      main: '#d4af37', // Gold accent
      light: '#e6c659',
      dark: '#b8941f',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
})

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [items, setItems] = useState<StructureItem[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState<Partial<StructureItem>>({ year: new Date().getFullYear() })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [availableFiles, setAvailableFiles] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [showTable, setShowTable] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  
  // Sorting state
  const [sortBy, setSortBy] = useState<keyof StructureItem | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const isEditing = useMemo(() => editingIndex !== null, [editingIndex])

  // Load available files and initial data
  useEffect(() => {
    let isMounted = true
    
    // First, try to load the separated files
    const loadSeparatedFiles = async () => {
      try {
        // Try to fetch a list of available files (we'll use a simple approach)
        const files = [
          'aeronca.json', 'aeropro-cz.json', 'aerotek.json', 'aerotrek.json', 'amd.json',
          'american-champion.json', 'american-general.json', 'american-legend.json', 'arion.json',
          'aviat.json', 'backcountry-super-cubs.json', 'beech.json', 'bellanca.json', 'boeing.json',
          'breezer-aircraft.json', 'cessna.json', 'champion.json', 'christen-industries.json',
          'cirrus.json', 'classic-aircraft-corp.json', 'columbia.json', 'commonwealth.json',
          'consolidated-aircraft-corp-stinson.json', 'cubcrafters.json', 'czech-aircraft.json',
          'dakota-cub-aircraft.json', 'davis.json', 'dehavilland.json', 'diamond.json',
          'dova-aircraft.json', 'eagle-aircraft.json', 'evektor-aerotechnik.json', 'extra.json',
          'falcon-aircraft-corp.json', 'fantasy-air.json', 'flight-design.json', 'fpna.json',
          'glasair.json', 'grumman.json', 'grumman-american.json', 'gulfstream.json',
          'hatz.json', 'howard.json', 'icon.json', 'indus.json', 'iniziative-industriali-italian.json',
          'jabiru.json', 'jihlavan-airplanes-sro.json', 'just-aircraft.json', 'kitfox.json',
          'lake.json', 'luscombe.json', 'maule.json', 'meyers.json', 'mooney.json',
          'murphy.json', 'navion.json', 'north-american.json', 'paradise.json', 'parkinson.json',
          'piper.json', 'pipistrel.json', 'pitts.json', 'rans.json', 'reims.json',
          'remos-aircraft.json', 'rockwell-commander.json', 'ryan.json', 'sky-arrow.json',
          'smith-super-cub.json', 'socata.json', 'stearman-aircraft.json', 'stinson.json',
          'super-18.json', 'taylorcraft.json', 'tecnam.json', 'thorp.json', 'tiger-aircraft.json',
          'tl-ultralight-sro.json', 'unknown.json', 'vans.json', 'waco.json', 'zlin.json'
        ]
        
        if (isMounted) {
          setAvailableFiles(files)
          // Don't load any file initially, just show the buttons
          setLoading(false)
        }
      } catch (error) {
        console.log('Separated files not available, falling back to database.json')
        // Fallback to original database.json
        await loadDatabaseJson()
      }
    }
    
    const loadDatabaseJson = async () => {
      try {
        const res = await fetch('/database.json', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        const parsed = z.array(itemSchema).safeParse(json)
        if (parsed.success && isMounted) {
          setItems(parsed.data)
        }
      } catch {
        // ignore if not present
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    // Removed unused loadFile function
    
    loadSeparatedFiles()
    
    return () => {
      isMounted = false
    }
  }, [])

  function openAddDialog() {
    setDraft({ year: new Date().getFullYear() })
    setErrors({})
    setEditingIndex(null)
    setOpen(true)
  }

  function openEditDialog(index: number) {
    setDraft(items[index])
    setErrors({})
    setEditingIndex(index)
    setOpen(true)
  }

  function closeDialog() {
    setOpen(false)
  }

  function handleDraftChange(field: keyof StructureItem, value: string) {
    setDraft(prev => ({ ...prev, [field]: field === 'year' ? Number(value) : value }))
  }

  function generateHashForField(field: keyof StructureItem) {
    const currentValue = draft[field]
    if (currentValue && typeof currentValue === 'string' && currentValue.trim() !== '') {
      const generatedHash = hashCode(currentValue.trim())
      setDraft(prev => ({ ...prev, [field]: generatedHash }))
    }
  }

  function validateDraft(): StructureItem | null {
    const parsed = itemSchema.safeParse(draft)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.')
        fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return null
    }
    setErrors({})
    return parsed.data
  }

  function saveDraft() {
    const valid = validateDraft()
    if (!valid) return
    
    // If this is a new item (not editing), generate hash automatically
    if (!isEditing) {
      // Create a unique string from the item data for hash generation
      const hashString = `${valid.labelMake}-${valid.labelModel}-${valid.year}-${Date.now()}`
      valid.hash = hashCode(hashString)
    }
    
    if (isEditing && editingIndex !== null) {
      setItems(prev => prev.map((it, i) => (i === editingIndex ? valid : it)))
    } else {
      setItems(prev => [...prev, valid])
    }
    setOpen(false)
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  // Removed unused onClickImport function

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result))
        if (!Array.isArray(json)) throw new Error('JSON must be an array')
        const parsed = z.array(itemSchema).safeParse(json)
        if (!parsed.success) throw new Error('Items do not match schema')
        setItems(parsed.data)
      } catch (err) {
        alert((err as Error).message)
      } finally {
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  async function exportJson() {
    try {
      // Fetch all aircraft make files and collate them
      const allItems: StructureItem[] = []
      
      for (const file of availableFiles) {
        try {
          const res = await fetch(`/separated/${file}`, { cache: 'no-store' })
          if (res.ok) {
            const json = await res.json()
            const parsed = z.array(itemSchema).safeParse(json)
            if (parsed.success) {
              allItems.push(...parsed.data)
            }
          }
        } catch (error) {
          console.log(`Error loading ${file}:`, error)
        }
      }
      
      const data = JSON.stringify(allItems, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'makes-models.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    }
  }

  function handleFileChange(filename: string) {
    setSelectedFile(filename)
    setLoading(true)
    setItems([])
    setShowTable(true)
    
    // Load the selected file
    const loadFile = async () => {
      try {
        const res = await fetch(`/separated/${filename}`, { cache: 'no-store' })
        if (!res.ok) {
          console.log(`File ${filename} not found`)
          return
        }
        const json = await res.json()
        const parsed = z.array(itemSchema).safeParse(json)
        if (parsed.success) {
          setItems(parsed.data)
        }
      } catch (error) {
        console.log(`Error loading ${filename}:`, error)
      } finally {
        setLoading(false)
      }
    }
    
    loadFile()
  }

  function formatMakeName(filename: string): string {
    return filename
      .replace('.json', '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  function goBackToSelection() {
    setShowTable(false)
    setSelectedFile('')
    setItems([])
    setSortBy(null)
    setSortDirection('asc')
  }

  // Sorting functions
  function handleSort(column: keyof StructureItem) {
    const isAsc = sortBy === column && sortDirection === 'asc'
    setSortDirection(isAsc ? 'desc' : 'asc')
    setSortBy(column)
  }

  const sortedItems = useMemo(() => {
    if (!sortBy) return items
    
    return [...items].sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]
      
      // Handle number sorting for year
      if (sortBy === 'year') {
        const aNum = Number(aVal)
        const bNum = Number(bVal)
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
      }
      
      // Handle string sorting for other columns
      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      
      if (sortDirection === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0
      }
    })
  }, [items, sortBy, sortDirection])

  // Authentication functions
  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    const correctPassword = 'wings@important2025'
    
    if (password === correctPassword) {
      setIsAuthenticated(true)
      setAuthError('')
    } else {
      setAuthError('Incorrect password. Please try again.')
      setPassword('')
    }
  }

  function handleLogout() {
    setIsAuthenticated(false)
    setPassword('')
    setAuthError('')
    setShowTable(false)
    setSelectedFile('')
    setItems([])
  }

  // If not authenticated, show login form
  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <Box 
          sx={{ 
            minHeight: '100vh', 
            bgcolor: 'background.default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Container maxWidth="sm">
            <Card sx={{ p: 4, boxShadow: 3 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ color: 'primary.main', mb: 1 }}>
                  Makes Models Builder
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Enter password to access the application
                </Typography>
              </Box>
              
              <form onSubmit={handlePasswordSubmit}>
                <TextField
                  fullWidth
                  type="password"
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={Boolean(authError)}
                  helperText={authError}
                  sx={{ mb: 3 }}
                  autoFocus
                />
                
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={!password.trim()}
                >
                  Access Application
                </Button>
              </form>
            </Card>
          </Container>
        </Box>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Makes Models Builder
          </Typography>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={onFileSelected}
          />
          <Button color="inherit" startIcon={<Save />} onClick={exportJson} disabled={availableFiles.length === 0}>
            Export
          </Button>
          <Button color="inherit" onClick={handleLogout} sx={{ ml: 1 }}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} disableGutters sx={{ py: 3, px: 2 }}>
        {!showTable ? (
          // Show aircraft make selection buttons
          <Box>
            <Typography variant="h4" sx={{ mb: 3, textAlign: 'center', color: 'primary.main' }}>
              Select Aircraft Make
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading aircraft makes...</Typography>
              </Box>
            ) : (
              <Box>
                <Box sx={{ mb: 2, maxWidth: 480, mx: 'auto' }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search aircraft makes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </Box>
                <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 2,
                }}>
                  {availableFiles
                    .filter((file) =>
                      formatMakeName(file).toLowerCase().includes(searchQuery.trim().toLowerCase())
                    )
                    .map((file) => (
                      <Card key={file} sx={{ height: '100%' }}>
                        <CardActionArea
                          onClick={() => handleFileChange(file)}
                          sx={{ height: '100%', p: 2 }}
                        >
                          <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" component="div">
                              {formatMakeName(file)}
                            </Typography>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    ))}
                </Box>
              </Box>
            )}
          </Box>
        ) : (
          // Show table view
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Box>
                <Button onClick={goBackToSelection} sx={{ mb: 1 }}>
                  ← Back to Aircraft Makes
                </Button>
                <Typography variant="h5" sx={{ color: 'primary.main' }}>
                  {formatMakeName(selectedFile)} ({items.length} items)
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<Add />} onClick={openAddDialog}>
                Add item
              </Button>
            </Stack>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading {formatMakeName(selectedFile)}...</Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === 'year'}
                          direction={sortBy === 'year' ? sortDirection : 'asc'}
                          onClick={() => handleSort('year')}
                        >
                          Year
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === 'labelMake'}
                          direction={sortBy === 'labelMake' ? sortDirection : 'asc'}
                          onClick={() => handleSort('labelMake')}
                        >
                          Label Make
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === 'labelModel'}
                          direction={sortBy === 'labelModel' ? sortDirection : 'asc'}
                          onClick={() => handleSort('labelModel')}
                        >
                          Label Model
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === 'oraeroMake'}
                          direction={sortBy === 'oraeroMake' ? sortDirection : 'asc'}
                          onClick={() => handleSort('oraeroMake')}
                        >
                          Oraero Make
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === 'oraeroModel'}
                          direction={sortBy === 'oraeroModel' ? sortDirection : 'asc'}
                          onClick={() => handleSort('oraeroModel')}
                        >
                          Oraero Model
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === 'iatMake'}
                          direction={sortBy === 'iatMake' ? sortDirection : 'asc'}
                          onClick={() => handleSort('iatMake')}
                        >
                          IAT Make
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === 'iatModel'}
                          direction={sortBy === 'iatModel' ? sortDirection : 'asc'}
                          onClick={() => handleSort('iatModel')}
                        >
                          IAT Model
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === 'rokstoneMake'}
                          direction={sortBy === 'rokstoneMake' ? sortDirection : 'asc'}
                          onClick={() => handleSort('rokstoneMake')}
                        >
                          Rokstone Make
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === 'rokstoneModel'}
                          direction={sortBy === 'rokstoneModel' ? sortDirection : 'asc'}
                          onClick={() => handleSort('rokstoneModel')}
                        >
                          Rokstone Model
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === 'sfMake'}
                          direction={sortBy === 'sfMake' ? sortDirection : 'asc'}
                          onClick={() => handleSort('sfMake')}
                        >
                          SF Make
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortBy === 'sfModel'}
                          direction={sortBy === 'sfModel' ? sortDirection : 'asc'}
                          onClick={() => handleSort('sfModel')}
                        >
                          SF Model
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedItems.map((it) => {
                      // Find the original index for edit/delete operations
                      const originalIndex = items.findIndex(item => item.hash === it.hash)
                      return (
                        <TableRow key={it.hash} hover>
                          <TableCell>{it.year}</TableCell>
                          <TableCell>{it.labelMake}</TableCell>
                          <TableCell>{it.labelModel}</TableCell>
                          <TableCell>{it.oraeroMake}</TableCell>
                          <TableCell>{it.oraeroModel}</TableCell>
                          <TableCell>{it.iatMake}</TableCell>
                          <TableCell>{it.iatModel}</TableCell>
                          <TableCell>{it.rokstoneMake}</TableCell>
                          <TableCell>{it.rokstoneModel}</TableCell>
                          <TableCell>{it.sfMake}</TableCell>
                          <TableCell>{it.sfModel}</TableCell>
                          <TableCell align="right">
                            <IconButton color="primary" onClick={() => openEditDialog(originalIndex)}><Edit /></IconButton>
                            <IconButton color="error" onClick={() => removeItem(originalIndex)}><Delete /></IconButton>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Container>

      <Dialog open={open} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>{isEditing ? 'Edit item' : 'Add item'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mt: 1 }}>
            <TextField 
              label="hash" 
              value={draft.hash ?? ''} 
              onChange={(e) => handleDraftChange('hash', e.target.value)} 
              error={Boolean(errors.hash)} 
              helperText={isEditing ? errors.hash : "Auto-generated for new items"} 
              disabled={!isEditing}
              placeholder={isEditing ? "" : "Auto-generated"}
            />
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField 
                label="labelMake" 
                value={draft.labelMake ?? ''} 
                onChange={(e) => handleDraftChange('labelMake', e.target.value)} 
                error={Boolean(errors.labelMake)} 
                helperText={errors.labelMake}
                fullWidth
              />
              <IconButton 
                onClick={() => generateHashForField('labelMake')} 
                size="small" 
                title="Generate hash for this field"
                disabled={!draft.labelMake || draft.labelMake.trim() === ''}
              >
                <Tag />
              </IconButton>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField 
                label="labelModel" 
                value={draft.labelModel ?? ''} 
                onChange={(e) => handleDraftChange('labelModel', e.target.value)} 
                error={Boolean(errors.labelModel)} 
                helperText={errors.labelModel}
                fullWidth
              />
              <IconButton 
                onClick={() => generateHashForField('labelModel')} 
                size="small" 
                title="Generate hash for this field"
                disabled={!draft.labelModel || draft.labelModel.trim() === ''}
              >
                <Tag />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField 
                label="oraeroMake" 
                value={draft.oraeroMake ?? ''} 
                onChange={(e) => handleDraftChange('oraeroMake', e.target.value)}
                fullWidth
              />
              <IconButton 
                onClick={() => generateHashForField('oraeroMake')} 
                size="small" 
                title="Generate hash for this field"
                disabled={!draft.oraeroMake || draft.oraeroMake.trim() === ''}
              >
                <Tag />
              </IconButton>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField 
                label="oraeroModel" 
                value={draft.oraeroModel ?? ''} 
                onChange={(e) => handleDraftChange('oraeroModel', e.target.value)}
                fullWidth
              />
              <IconButton 
                onClick={() => generateHashForField('oraeroModel')} 
                size="small" 
                title="Generate hash for this field"
                disabled={!draft.oraeroModel || draft.oraeroModel.trim() === ''}
              >
                <Tag />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField 
                label="iatMake" 
                value={draft.iatMake ?? ''} 
                onChange={(e) => handleDraftChange('iatMake', e.target.value)}
                fullWidth
              />
              <IconButton 
                onClick={() => generateHashForField('iatMake')} 
                size="small" 
                title="Generate hash for this field"
                disabled={!draft.iatMake || draft.iatMake.trim() === ''}
              >
                <Tag />
              </IconButton>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField 
                label="iatModel" 
                value={draft.iatModel ?? ''} 
                onChange={(e) => handleDraftChange('iatModel', e.target.value)}
                fullWidth
              />
              <IconButton 
                onClick={() => generateHashForField('iatModel')} 
                size="small" 
                title="Generate hash for this field"
                disabled={!draft.iatModel || draft.iatModel.trim() === ''}
              >
                <Tag />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField 
                label="rokstoneMake" 
                value={draft.rokstoneMake ?? ''} 
                onChange={(e) => handleDraftChange('rokstoneMake', e.target.value)}
                fullWidth
              />
              <IconButton 
                onClick={() => generateHashForField('rokstoneMake')} 
                size="small" 
                title="Generate hash for this field"
                disabled={!draft.rokstoneMake || draft.rokstoneMake.trim() === ''}
              >
                <Tag />
              </IconButton>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField 
                label="rokstoneModel" 
                value={draft.rokstoneModel ?? ''} 
                onChange={(e) => handleDraftChange('rokstoneModel', e.target.value)}
                fullWidth
              />
              <IconButton 
                onClick={() => generateHashForField('rokstoneModel')} 
                size="small" 
                title="Generate hash for this field"
                disabled={!draft.rokstoneModel || draft.rokstoneModel.trim() === ''}
              >
                <Tag />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField 
                label="sfMake" 
                value={draft.sfMake ?? ''} 
                onChange={(e) => handleDraftChange('sfMake', e.target.value)}
                fullWidth
              />
              <IconButton 
                onClick={() => generateHashForField('sfMake')} 
                size="small" 
                title="Generate hash for this field"
                disabled={!draft.sfMake || draft.sfMake.trim() === ''}
              >
                <Tag />
              </IconButton>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField 
                label="sfModel" 
                value={draft.sfModel ?? ''} 
                onChange={(e) => handleDraftChange('sfModel', e.target.value)}
                fullWidth
              />
              <IconButton 
                onClick={() => generateHashForField('sfModel')} 
                size="small" 
                title="Generate hash for this field"
                disabled={!draft.sfModel || draft.sfModel.trim() === ''}
              >
                <Tag />
              </IconButton>
            </Box>

            <TextField type="number" label="year" value={draft.year ?? ''} onChange={(e) => handleDraftChange('year', e.target.value)} error={Boolean(errors.year)} helperText={errors.year} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button variant="contained" onClick={saveDraft}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
    </ThemeProvider>
  )
}

export default App
