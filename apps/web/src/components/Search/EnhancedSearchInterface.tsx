import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';
import { Search, Sparkles, Filter, Clock, Zap, ChevronDown, X, Lightbulb } from 'lucide-react';
import Button from '../Button/Button';
import Input from '../Zeda/Input/Input';
import { FilterCondition } from '../Filter/filterHelpers';
import { debounce } from 'lodash';

interface SearchSuggestion {
  type: 'category' | 'status' | 'assignee' | 'customer' | 'timeframe' | 'priority';
  value: string;
  display: string;
  confidence: number;
  context?: string;
}

interface SearchIntent {
  type: 'filter' | 'find' | 'analyze' | 'compare';
  confidence: number;
  extractedFilters: any;
  suggestedQuery: string;
  alternatives: string[];
}

interface NaturalLanguageQuery {
  originalQuery: string;
  intent: SearchIntent;
  suggestions: SearchSuggestion[];
  processedQuery: string;
  metadata: {
    processingTime: number;
    confidenceScore: number;
    alternatives: string[];
  };
}

interface EnhancedSearchInterfaceProps {
  organizationId: string;
  onSearch: (query: string, filters: any, searchType: 'natural' | 'boolean' | 'filter') => void;
  onFiltersChange?: (filters: FilterCondition[]) => void;
  initialQuery?: string;
  placeholder?: string;
  showAdvancedOptions?: boolean;
}

const SearchContainer = styled.div`
  position: relative;
  width: 100%;
`;

const SearchInputContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  background: ${Colors.white};
  border: 2px solid ${Colors.grey200};
  border-radius: 12px;
  transition: all 0.2s ease;
  
  &:focus-within {
    border-color: ${Colors.primary500};
    box-shadow: 0 0 0 3px ${Colors.primary100};
  }
  
  &.has-suggestions {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
`;

const SearchIconContainer = styled.div`
  display: flex;
  align-items: center;
  padding: 0 12px;
  color: ${Colors.grey400};
`;

const SearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  padding: 14px 8px;
  font-size: 16px;
  color: ${Colors.grey900};
  background: transparent;
  
  &::placeholder {
    color: ${Colors.grey400};
  }
`;

const SearchTypeToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  border-left: 1px solid ${Colors.grey200};
`;

const SearchTypeButton = styled.button<{ active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: ${props => props.active ? Colors.primary100 : 'transparent'};
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: ${props => props.active ? Colors.primary700 : Colors.grey600};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.active ? Colors.primary100 : Colors.grey50};
  }
`;

const SuggestionsDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: ${Colors.white};
  border: 2px solid ${Colors.primary500};
  border-top: none;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 400px;
  overflow-y: auto;
`;

const SuggestionItem = styled.div<{ highlighted?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: ${props => props.highlighted ? Colors.grey50 : 'transparent'};
  cursor: pointer;
  transition: background 0.2s ease;
  
  &:hover {
    background: ${Colors.grey50};
  }
  
  &:last-child {
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
  }
`;

const SuggestionIcon = styled.div<{ type: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: ${props => {
    switch (props.type) {
      case 'category': return Colors.blue100;
      case 'status': return Colors.green100;
      case 'priority': return Colors.orange100;
      case 'timeframe': return Colors.purple100;
      default: return Colors.grey100;
    }
  }};
  color: ${props => {
    switch (props.type) {
      case 'category': return Colors.blue600;
      case 'status': return Colors.green600;
      case 'priority': return Colors.orange600;
      case 'timeframe': return Colors.purple600;
      default: return Colors.grey600;
    }
  }};
`;

const SuggestionContent = styled.div`
  flex: 1;
`;

const SuggestionTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${Colors.grey900};
`;

const SuggestionContext = styled.div`
  font-size: 12px;
  color: ${Colors.grey500};
  margin-top: 2px;
`;

const SuggestionConfidence = styled.div<{ confidence: number }>`
  font-size: 11px;
  font-weight: 500;
  color: ${props => props.confidence > 0.8 ? Colors.green600 : 
              props.confidence > 0.6 ? Colors.orange600 : Colors.grey500};
`;

const IntentIndicator = styled.div<{ type: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  margin: 8px 16px;
  background: ${Colors.primary50};
  border: 1px solid ${Colors.primary200};
  border-radius: 8px;
  font-size: 12px;
  color: ${Colors.primary700};
`;

const LoadingIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: ${Colors.grey500};
  font-size: 14px;
`;

const QuickFilters = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
`;

const QuickFilterButton = styled.button<{ active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: ${props => props.active ? Colors.primary100 : Colors.grey50};
  border: 1px solid ${props => props.active ? Colors.primary300 : Colors.grey200};
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: ${props => props.active ? Colors.primary700 : Colors.grey600};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.active ? Colors.primary100 : Colors.grey100};
    border-color: ${props => props.active ? Colors.primary300 : Colors.grey300};
  }
`;

const EnhancedSearchInterface: React.FC<EnhancedSearchInterfaceProps> = ({
  organizationId,
  onSearch,
  onFiltersChange,
  initialQuery = '',
  placeholder = 'Search feedback with natural language... (e.g., \"show urgent issues from last week\")',
  showAdvancedOptions = true
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState<'natural' | 'boolean' | 'filter'>('natural');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [nlQuery, setNlQuery] = useState<NaturalLanguageQuery | null>(null);
  const [quickFilters, setQuickFilters] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced suggestion fetching
  const fetchSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/search/${organizationId}/suggestions?q=${encodeURIComponent(searchQuery)}&limit=5`, {
          credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.data.suggestions) {
          setSuggestions(data.data.suggestions);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [organizationId]
  );

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedSuggestion(-1);
    
    if (searchType === 'natural') {
      fetchSuggestions(value);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestion >= 0) {
          applySuggestion(suggestions[selectedSuggestion]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
        break;
    }
  };

  // Apply selected suggestion
  const applySuggestion = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.value);
    setShowSuggestions(false);
    setSelectedSuggestion(-1);
    
    // Trigger search with suggestion
    setTimeout(() => handleSearch(), 100);
  };

  // Handle search execution
  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      if (searchType === 'natural') {
        // Process natural language query
        const response = await fetch(`/api/search/${organizationId}/natural`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: query.trim()
          })
        });
        
        const data = await response.json();
        if (data.success) {
          setNlQuery(data.data.query);
          onSearch(query, data.data.appliedFilters, 'natural');
        }
      } else if (searchType === 'boolean') {
        // Process boolean query
        const response = await fetch(`/api/search/${organizationId}/boolean`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: query.trim()
          })
        });
        
        const data = await response.json();
        if (data.success) {
          onSearch(query, data.data.appliedFilters, 'boolean');
        }
      } else {
        // Regular filter search
        onSearch(query, { search: query.trim() }, 'filter');
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
      setShowSuggestions(false);
    }
  };

  // Handle quick filter clicks
  const handleQuickFilter = (filter: string) => {
    const isActive = quickFilters.includes(filter);
    const newFilters = isActive 
      ? quickFilters.filter(f => f !== filter)
      : [...quickFilters, filter];
    
    setQuickFilters(newFilters);
    
    // Add filter to query
    const filterQuery = newFilters.join(' ');
    const newQuery = query ? `${query} ${filterQuery}` : filterQuery;
    setQuery(newQuery);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSearchTypeIcon = (type: string) => {
    switch (type) {
      case 'natural': return <Sparkles size={14} />;
      case 'boolean': return <Zap size={14} />;
      default: return <Search size={14} />;
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'category': return '🏷️';
      case 'status': return '📊';
      case 'priority': return '⚡';
      case 'timeframe': return '📅';
      case 'assignee': return '👤';
      case 'customer': return '🏢';
      default: return '🔍';
    }
  };

  return (
    <SearchContainer>
      <SearchInputContainer className={showSuggestions ? 'has-suggestions' : ''}>
        <SearchIconContainer>
          {isLoading ? (
            <div className="animate-spin">
              <Search size={16} />
            </div>
          ) : (
            <Search size={16} />
          )}
        </SearchIconContainer>
        
        <SearchInput
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setShowSuggestions(true)}
          placeholder={placeholder}
        />
        
        {showAdvancedOptions && (
          <SearchTypeToggle>
            <SearchTypeButton
              active={searchType === 'natural'}
              onClick={() => setSearchType('natural')}
              title="Natural Language Search"
            >
              {getSearchTypeIcon('natural')}
              Smart
            </SearchTypeButton>
            
            <SearchTypeButton
              active={searchType === 'boolean'}
              onClick={() => setSearchType('boolean')}
              title="Boolean Search (AND, OR, NOT)"
            >
              {getSearchTypeIcon('boolean')}
              Boolean
            </SearchTypeButton>
            
            <Button
              onClick={handleSearch}
              variant="primary"
              size="sm"
              disabled={!query.trim() || isLoading}
            >
              Search
            </Button>
          </SearchTypeToggle>
        )}
      </SearchInputContainer>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <SuggestionsDropdown ref={suggestionsRef}>
          {isLoading ? (
            <LoadingIndicator>
              <Search size={14} className="animate-spin mr-2" />
              Finding suggestions...
            </LoadingIndicator>
          ) : (
            <>
              {nlQuery?.intent && (
                <IntentIndicator type={nlQuery.intent.type}>
                  <Lightbulb size={12} />
                  Detected intent: {nlQuery.intent.type} 
                  ({Math.round(nlQuery.intent.confidence * 100)}% confidence)
                </IntentIndicator>
              )}
              
              {suggestions.map((suggestion, index) => (
                <SuggestionItem
                  key={`${suggestion.type}-${suggestion.value}-${index}`}
                  highlighted={index === selectedSuggestion}
                  onClick={() => applySuggestion(suggestion)}
                >
                  <SuggestionIcon type={suggestion.type}>
                    {getSuggestionIcon(suggestion.type)}
                  </SuggestionIcon>
                  
                  <SuggestionContent>
                    <SuggestionTitle>{suggestion.display}</SuggestionTitle>
                    {suggestion.context && (
                      <SuggestionContext>{suggestion.context}</SuggestionContext>
                    )}
                  </SuggestionContent>
                  
                  <SuggestionConfidence confidence={suggestion.confidence}>
                    {Math.round(suggestion.confidence * 100)}%
                  </SuggestionConfidence>
                </SuggestionItem>
              ))}
              
              {suggestions.length === 0 && !isLoading && (
                <SuggestionItem>
                  <SuggestionContent>
                    <SuggestionTitle>No suggestions found</SuggestionTitle>
                    <SuggestionContext>
                      Try typing more specific terms or use natural language
                    </SuggestionContext>
                  </SuggestionContent>
                </SuggestionItem>
              )}
            </>
          )}
        </SuggestionsDropdown>
      )}

      {/* Quick Filters */}
      <QuickFilters>
        {['urgent', 'new status', 'last 7 days', 'negative sentiment', 'unassigned'].map(filter => (
          <QuickFilterButton
            key={filter}
            active={quickFilters.includes(filter)}
            onClick={() => handleQuickFilter(filter)}
          >
            {filter}
          </QuickFilterButton>
        ))}
      </QuickFilters>
    </SearchContainer>
  );
};

export default EnhancedSearchInterface;